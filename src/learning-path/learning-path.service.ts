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

interface LearningPathRequestEvent {
  eventId: string;
  eventType: string;
  eventData: {
    request_id: string;
    user_id: string;
    goal: string;
    current_level: LearningLevel;
    preferences?: Record<string, any>;
    available_time?: string;
    metadata?: Record<string, any>;
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
    const learningPathId = `lp_${uuidv4().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();

    // Create initial learning path with processing status in Neo4j
    const cypherCreateProcessing = `
      // Find the user
      MATCH (u:User {id: $userId})
      
      // Delete existing learning path if any (one user can only have one learning path)
      OPTIONAL MATCH (u)-[r:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      OPTIONAL MATCH (oldLp)-[r2:HAS_STEP]->(oldStep:LearningPathStep)
      DETACH DELETE oldStep, oldLp
      
      // Create the new learning path node with processing status
      WITH u
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: $learningGoal,
        difficultyLevel: $currentLevel,
        status: 'processing',
        requestId: $requestId,
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      // Create relationship between user and learning path
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      
      RETURN lp.id as learningPathId
    `;

    const learningPathRequestEvent: LearningPathRequestEvent = {
      eventId,
      eventType: 'learning_path.request',
      eventData: {
        request_id: eventId,
        user_id: userId,
        goal: dto.learningGoal,
        current_level: dto.currentLevel,
        preferences: dto.preferences,
        available_time: dto.availableTime || 'flexible',
        metadata: {},
      },
      userId,
      metadata: {
        source: 'content-service',
        version: '1.0.0',
      },
    };

    try {
      // Create processing state in Neo4j
      await this.neo4jService.write(cypherCreateProcessing, {
        userId,
        learningPathId,
        learningGoal: dto.learningGoal,
        currentLevel: dto.currentLevel,
        requestId: eventId,
        timestamp,
      });

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Created learning path with processing status',
        { learningPathId, requestId: eventId, userId },
      );

      // Publish event to Kafka for AI service to consume
      await this.kafkaService.sendMessage({
        topic: 'learning_path.request',
        key: userId,
        value: JSON.stringify(learningPathRequestEvent),
      });

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning path request event published to Kafka',
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

    const timestamp = new Date().toISOString();

    // Transform steps from snake_case to camelCase
    const transformedSteps = learningPathData.learning_path.steps.map((step: any) => ({
      stepNumber: step.step_number,
      title: step.title,
      description: step.description,
      estimatedDuration: step.estimated_duration,
      resources: step.resources || [],
      prerequisites: step.prerequisites || [],
    }));

    const cypher = `
      // Find the user and their existing learning path
      MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      
      // Delete old steps if any
      OPTIONAL MATCH (lp)-[r2:HAS_STEP]->(oldStep:LearningPathStep)
      DETACH DELETE oldStep
      
      // Update the learning path node with generated data
      WITH u, lp
      SET lp.difficultyLevel = $difficultyLevel,
          lp.totalDuration = $totalDuration,
          lp.masteryScores = $masteryScores,
          lp.status = 'completed',
          lp.updatedAt = $timestamp
      
      // Create learning path steps
      WITH lp
      UNWIND $steps AS step
      CREATE (s:LearningPathStep {
        id: lp.id + '_step_' + toString(step.stepNumber),
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
      difficultyLevel: learningPathData.learning_path.difficulty_level,
      totalDuration: learningPathData.learning_path.total_duration,
      steps: transformedSteps,
      masteryScores: JSON.stringify(learningPathData.mastery_scores || {}),
      timestamp,
    };

    try {
      const result = await this.neo4jService.write(cypher, params);

      if (!result || result.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'LearningPathService',
          'No learning path found to update. User may not have requested a learning path.',
          { userId: learningPathData.user_id },
        );
        return;
      }

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning path saved successfully',
        { learningPathId: result[0].learningPathId, userId: learningPathData.user_id },
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
        lp.status as status,
        lp.requestId as requestId,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        CASE 
          WHEN lp.status = 'completed' THEN {
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
          }
          ELSE null
        END as learningPath
      ORDER BY lp.createdAt DESC
    `;

    try {
      const result = await this.neo4jService.read(cypher, { userId });

      return result.map((record: any) => {
        if (record.status === 'processing') {
          return {
            id: record.id,
            userId,
            learningGoal: record.learningGoal,
            status: 'processing',
            requestId: record.requestId,
            learningPath: null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          } as any;
        }

        return {
          id: record.id,
          userId,
          learningGoal: record.learningGoal,
          status: record.status || 'completed',
          learningPath: record.learningPath,
          masteryScores: record.masteryScores ? JSON.parse(record.masteryScores) : undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        } as any;
      });
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
        lp.status as status,
        lp.requestId as requestId,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        CASE 
          WHEN lp.status = 'completed' THEN {
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
          }
          ELSE null
        END as learningPath
    `;

    try {
      const result = await this.neo4jService.read(cypher, {
        userId,
      });

      if (!result || result.length === 0) {
        throw new NotFoundException('Learning path not found');
      }

      const record = result[0];
      
      // If status is processing, return a processing response
      if (record.status === 'processing') {
        return {
          id: record.id,
          userId,
          learningGoal: record.learningGoal,
          status: 'processing',
          requestId: record.requestId,
          learningPath: null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        } as any;
      }

      // Return completed learning path
      return {
        id: record.id,
        userId,
        learningGoal: record.learningGoal,
        status: record.status || 'completed',
        learningPath: record.learningPath,
        masteryScores: record.masteryScores ? JSON.parse(record.masteryScores) : undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      } as any;
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
