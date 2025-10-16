/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { KafkaService } from '../common/kafka/kafka.service';
import { ConfigService } from '@nestjs/config';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';
import {
  RequestLearningPathDto,
  LearningLevel,
} from './dto/request-learning-path.dto';
import { LearningPathResponseDto } from './dto/learning-path-response.dto';
import { GetLearningPathResponseDto } from './dto/learning-path.dto';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';

interface LearningGoalEvent {
  eventId: string;
  eventType: string;
  eventData: {
    learningGoal: string;
    currentLevel: LearningLevel;
    preferences?: Record<string, any>;
    availableTime?: string;
  };
  userId: string;
  metadata: {
    source: string;
    version: string;
  };
}

@Injectable()
export class LearningPathService {
  private readonly aiServiceUrl: string;

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly kafkaService: KafkaService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LearningPathService.name);
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  /**
   * Request learning path generation from AI service
   */
  async requestLearningPath(
    userId: string,
    dto: RequestLearningPathDto,
  ): Promise<LearningPathResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Requesting learning path generation',
      { userId, learningGoal: dto.learningGoal },
    );

    const eventId = `evt_${uuidv4().replace(/-/g, '')}`;

    const learningGoalEvent: LearningGoalEvent = {
      eventId,
      eventType: 'LEARNING_GOAL',
      eventData: {
        learningGoal: dto.learningGoal,
        currentLevel: dto.currentLevel,
        preferences: dto.preferences,
        availableTime: dto.availableTime || 'flexible',
      },
      userId,
      metadata: {
        source: 'content-service',
        version: '1.0.0',
      },
    };

    try {
      // Publish event to Kafka for AI service to consume
      await this.kafkaService.sendMessage({
        topic: 'learning_goal',
        key: userId,
        value: JSON.stringify(learningGoalEvent),
      });

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning goal event published to Kafka',
        { eventId, userId },
      );

      // Return immediate response
      return {
        message:
          'Learning path generation initiated. You will be notified once it is ready.',
        requestId: eventId,
        status: 'processing',
        estimatedTime: 30, // Estimated seconds
      };
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'LearningPathService',
        'Failed to publish learning goal event',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to initiate learning path generation',
      );
    }
  }

  /**
   * Save learning path received from AI service (called by Kafka consumer)
   */
  async saveLearningPath(learningPathData: any): Promise<void> {
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Saving learning path from AI service',
      { userId: learningPathData.user_id },
    );

    const learningPathId = `lp_${uuidv4().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();

    const cypher = `
      // Find the user
      MATCH (u:User {id: $userId})
      
      // Delete existing learning path if any (one user can only have one learning path)
      OPTIONAL MATCH (u)-[r:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      OPTIONAL MATCH (oldLp)-[r2:HAS_STEP]->(oldStep:LearningPathStep)
      DETACH DELETE oldStep, oldLp
      
      // Create the new learning path node
      WITH u
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: $learningGoal,
        difficultyLevel: $difficultyLevel,
        totalDuration: $totalDuration,
        masteryScores: $masteryScores,
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      // Create relationship between user and learning path
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      
      // Create learning path steps
      WITH lp
      UNWIND $steps AS step
      CREATE (s:LearningPathStep {
        id: $learningPathId + '_step_' + toString(step.stepNumber),
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedDuration: step.estimatedDuration,
        resources: step.resources,
        prerequisites: step.prerequisites
      })
      CREATE (lp)-[:HAS_STEP]->(s)
      
      // Connect steps with resources if they exist
      WITH s
      UNWIND s.resources AS resourceId
      OPTIONAL MATCH (r:Resource {id: resourceId})
      FOREACH (_ IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
        CREATE (s)-[:USES_RESOURCE]->(r)
      )
      
      RETURN lp.id as learningPathId
    `;

    const params = {
      userId: learningPathData.user_id,
      learningPathId,
      learningGoal: learningPathData.learning_goal,
      difficultyLevel: learningPathData.learning_path.difficulty_level,
      totalDuration: learningPathData.learning_path.total_duration,
      steps: learningPathData.learning_path.steps,
      masteryScores: JSON.stringify(learningPathData.mastery_scores || {}),
      timestamp,
    };

    try {
      await this.neo4jService.write(cypher, params);

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning path saved successfully',
        { learningPathId, userId: learningPathData.user_id },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'LearningPathService',
        'Failed to save learning path',
        error,
      );
      throw new InternalServerErrorException('Failed to save learning path');
    }
  }

  /**
   * Create a new learning path for a user
   */
  async createLearningPath(
    userId: string,
    dto: CreateLearningPathDto,
  ): Promise<GetLearningPathResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Creating new learning path',
      { userId, learningGoal: dto.learningGoal },
    );

    const learningPathId = `lp_${uuidv4().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();

    const cypher = `
      // Find the user
      MATCH (u:User {id: $userId})
      
      // Delete existing learning path if any (one user can only have one learning path)
      OPTIONAL MATCH (u)-[r:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      OPTIONAL MATCH (oldLp)-[r2:HAS_STEP]->(oldStep:LearningPathStep)
      DETACH DELETE oldStep, oldLp
      
      // Create the new learning path node
      WITH u
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: $learningGoal,
        difficultyLevel: $difficultyLevel,
        totalDuration: $totalDuration,
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      // Create relationship between user and learning path
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      
      // Create learning path steps
      WITH lp
      UNWIND $steps AS step
      CREATE (s:LearningPathStep {
        id: $learningPathId + '_step_' + toString(step.stepNumber),
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedDuration: step.estimatedDuration,
        resources: step.resources,
        prerequisites: step.prerequisites
      })
      CREATE (lp)-[:HAS_STEP]->(s)
      
      // Connect steps with resources if they exist
      WITH s
      UNWIND s.resources AS resourceId
      OPTIONAL MATCH (r:Resource {id: resourceId})
      FOREACH (_ IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
        CREATE (s)-[:USES_RESOURCE]->(r)
      )
      
      WITH s
      MATCH (lp:LearningPath {id: $learningPathId})
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, step
      ORDER BY step.stepNumber
      
      RETURN 
        lp.id as id,
        lp.learningGoal as learningGoal,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        {
          goal: lp.learningGoal,
          difficultyLevel: lp.difficultyLevel,
          totalDuration: lp.totalDuration,
          steps: COLLECT(DISTINCT {
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            estimatedDuration: step.estimatedDuration,
            resources: step.resources,
            prerequisites: step.prerequisites
          })
        } as learningPath
      LIMIT 1
    `;

    const params = {
      userId,
      learningPathId,
      learningGoal: dto.learningGoal,
      difficultyLevel: dto.difficultyLevel,
      totalDuration: dto.totalDuration,
      steps: dto.steps,
      timestamp,
    };

    try {
      const result = await this.neo4jService.write(cypher, params);

      if (!result || result.length === 0) {
        throw new InternalServerErrorException('Failed to create learning path');
      }

      const record = result[0];

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning path created successfully',
        { learningPathId, userId },
      );

      return {
        id: record.id,
        userId,
        learningGoal: record.learningGoal,
        learningPath: record.learningPath,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'LearningPathService',
        'Failed to create learning path',
        error,
      );
      throw new InternalServerErrorException('Failed to create learning path');
    }
  }

  /**
   * Get user's learning paths
   */
  async getUserLearningPaths(
    userId: string,
  ): Promise<GetLearningPathResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Fetching user learning paths',
      { userId },
    );

    const cypher = `
      MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, step
      ORDER BY step.stepNumber
      
      RETURN 
        lp.id as id,
        lp.learningGoal as learningGoal,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        {
          goal: lp.learningGoal,
          difficultyLevel: lp.difficultyLevel,
          totalDuration: lp.totalDuration,
          steps: COLLECT(DISTINCT {
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            estimatedDuration: step.estimatedDuration,
            resources: step.resources,
            prerequisites: step.prerequisites
          })
        } as learningPath
      ORDER BY lp.createdAt DESC
    `;

    try {
      const result = await this.neo4jService.read(cypher, { userId });

      return result.map((record: any) => ({
        id: record.id,
        userId,
        learningGoal: record.learningGoal,
        learningPath: record.learningPath,
        masteryScores: record.masteryScores ? JSON.parse(record.masteryScores) : undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'LearningPathService',
        'Failed to fetch learning paths',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch learning paths');
    }
  }

  /**
   * Get user's learning path (one user can only have one learning path)
   */
  async getLearningPathByUserId(
    userId: string,
  ): Promise<GetLearningPathResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Fetching learning path by user ID',
      { userId },
    );

    const cypher = `
      MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, step
      ORDER BY step.stepNumber
      
      RETURN 
        lp.id as id,
        lp.learningGoal as learningGoal,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        {
          goal: lp.learningGoal,
          difficultyLevel: lp.difficultyLevel,
          totalDuration: lp.totalDuration,
          steps: COLLECT(DISTINCT {
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            estimatedDuration: step.estimatedDuration,
            resources: step.resources,
            prerequisites: step.prerequisites
          })
        } as learningPath
    `;

    try {
      const result = await this.neo4jService.read(cypher, {
        userId,
      });

      if (!result || result.length === 0) {
        throw new NotFoundException('Learning path not found');
      }

      const record = result[0];
      return {
        id: record.id,
        userId,
        learningGoal: record.learningGoal,
        learningPath: record.learningPath,
        masteryScores: record.masteryScores ? JSON.parse(record.masteryScores) : undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'LearningPathService',
        'Failed to fetch learning path',
        error,
      );
      throw new InternalServerErrorException('Failed to fetch learning path');
    }
  }
}
