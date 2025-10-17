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
      // Find or create the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      WITH u
      // Delete existing learning path if any (one user can only have one learning path)
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      WITH u, oldLp
      WHERE oldLp IS NOT NULL
      CALL {
        WITH oldLp
        OPTIONAL MATCH (oldLp)-[:HAS_STEP]->(oldStep:LearningPathStep)
        DETACH DELETE oldStep, oldLp
      }
      
      WITH u
      // Create the new learning path node with processing status
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
  async saveLearningPath(learningPathData: Record<string, any>): Promise<void> {
    const userId = learningPathData.user_id as string | undefined;
    LoggerUtil.logInfo(
      this.logger,
      'LearningPathService',
      'Saving learning path from AI service',
      { userId },
    );

    const timestamp = new Date().toISOString();
    const learningPathId = `lp_${uuidv4().replace(/-/g, '')}`;

    // Transform steps from snake_case to camelCase
    // Note: AI service returns resource names/descriptions, not IDs
    const stepsArray = (learningPathData.learning_path as Record<string, any>).steps as Array<Record<string, any>>;
    const transformedSteps: Array<Record<string, any>> = stepsArray.map((step) => ({
      stepNumber: step.step_number as number,
      title: step.title as string,
      description: step.description as string,
      estimatedDuration: step.estimated_duration as string,
      resources: (step.resources as string[] | undefined) || [],
      prerequisites: (step.prerequisites as string[] | undefined) || [],
    }));

    const cypher = `
      // Find or create the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      WITH u
      // Delete existing learning path if any
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      WITH u, oldLp
      WHERE oldLp IS NOT NULL
      CALL {
        WITH oldLp
        OPTIONAL MATCH (oldLp)-[:HAS_STEP]->(s)
        DETACH DELETE s, oldLp
      }
      
      WITH u
      // Create new learning path node with generated data
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: $learningGoal,
        difficultyLevel: $difficultyLevel,
        totalDuration: $totalDuration,
        masteryScores: $masteryScores,
        status: 'completed',
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      // Create relationship between user and learning path
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      
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
      
      WITH lp
      // Return the created/updated learning path
      RETURN lp.id as learningPathId
    `;

    const params = {
      userId: learningPathData.user_id as string,
      learningPathId,
      learningGoal: ((learningPathData.learning_path as Record<string, any>).goal || learningPathData.goal || 'Learning Path') as string,
      difficultyLevel: (learningPathData.learning_path as Record<string, any>).difficulty_level as string,
      totalDuration: (learningPathData.learning_path as Record<string, any>).total_duration as string,
      steps: transformedSteps,
      masteryScores: JSON.stringify((learningPathData.mastery_scores as Record<string, any> | undefined) || {}),
      timestamp,
    };

    try {
      const result = (await this.neo4jService.write(cypher, params)) as Array<Record<string, any>>;

      if (!result || result.length === 0) {
        LoggerUtil.logError(
          this.logger,
          'LearningPathService',
          'Failed to create/update learning path - no result returned',
          { userId },
        );
        throw new InternalServerErrorException('Failed to save learning path');
      }

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Learning path saved successfully',
        { learningPathId: (result[0].learningPathId as string) || '', userId },
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
      // Find or create the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      WITH u
      // Delete existing learning path if any (one user can only have one learning path)
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(oldLp:LearningPath)
      WITH u, oldLp
      WHERE oldLp IS NOT NULL
      CALL {
        WITH oldLp
        OPTIONAL MATCH (oldLp)-[:HAS_STEP]->(oldStep:LearningPathStep)
        DETACH DELETE oldStep, oldLp
      }
      
      WITH u
      // Create the new learning path node
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
        id: lp.id + '_step_' + toString(step.stepNumber),
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedDuration: step.estimatedDuration,
        resources: step.resources,
        prerequisites: step.prerequisites
      })
      CREATE (lp)-[:HAS_STEP]->(s)
      
      WITH lp
      // Return the created learning path and steps
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, COLLECT(step) as steps
      ORDER BY lp.createdAt DESC
      
      RETURN 
        lp.id as id,
        lp.learningGoal as learningGoal,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        {
          goal: lp.learningGoal,
          difficultyLevel: lp.difficultyLevel,
          totalDuration: lp.totalDuration,
          steps: [s IN steps WHERE s IS NOT NULL | {
            stepNumber: s.stepNumber,
            title: s.title,
            description: s.description,
            estimatedDuration: s.estimatedDuration,
            resources: s.resources,
            prerequisites: s.prerequisites
          }]
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
      const result = (await this.neo4jService.write(cypher, params)) as Array<Record<string, any>>;

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

      const learningPathData = record.learningPath as Record<string, any> | null;
      const lp: any = learningPathData ? {
        goal: (learningPathData.goal as string) || '',
        difficultyLevel: (learningPathData.difficultyLevel as string) || 'beginner',
        totalDuration: (learningPathData.totalDuration as string) || '0',
        steps: (learningPathData.steps as Array<Record<string, any>>) || [],
      } : null;
      
      return {
        id: record.id as string,
        userId,
        learningGoal: record.learningGoal as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        learningPath: lp,
        createdAt: record.createdAt as string,
        updatedAt: record.updatedAt as string,
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

    const timestamp = new Date().toISOString();

    const cypher = `
      // Find or create the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      WITH u
      
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, step
      ORDER BY step.stepNumber ASC

      WITH lp, COLLECT(step) as steps
      ORDER BY lp.createdAt DESC
      
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
            steps: [s IN steps WHERE s IS NOT NULL | {
              stepNumber: s.stepNumber,
              title: s.title,
              description: s.description,
              estimatedDuration: s.estimatedDuration,
              resources: s.resources,
              prerequisites: s.prerequisites
            }]
          }
          ELSE null
        END as learningPath
    `;

    try {
      const result = (await this.neo4jService.read(cypher, { userId, timestamp })) as Array<Record<string, any>>;

      // Filter out null results (when user has no learning path)
      const responses: any[] = result
        .filter((record) => (record.id as string | null) !== null)
        .map((record) => {
          if ((record.status as string | undefined) === 'processing') {
            return {
              id: record.id as string,
              userId,
              learningGoal: record.learningGoal as string,
              status: 'processing',
              requestId: record.requestId as string | undefined,
              learningPath: null,
              createdAt: record.createdAt as string,
              updatedAt: record.updatedAt as string,
            };
          }

          const masteryScoresStr = record.masteryScores as string | undefined;
          return {
            id: record.id as string,
            userId,
            learningGoal: record.learningGoal as string,
            status: (record.status as string | undefined) || 'completed',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            learningPath: record.learningPath,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            masteryScores: masteryScoresStr ? JSON.parse(masteryScoresStr) : undefined,
            createdAt: record.createdAt as string,
            updatedAt: record.updatedAt as string,
          };
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return responses;
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

    // Simplified Cypher query that doesn't create users in GET request
    const cypher = `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH u, lp, step
      ORDER BY step.stepNumber ASC
      
      WITH u, lp, COLLECT(step) as steps
      
      RETURN 
        u.id as userId,
        lp.id as learningPathId,
        lp.learningGoal as learningGoal,
        lp.status as status,
        lp.requestId as requestId,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        lp.difficultyLevel as difficultyLevel,
        lp.totalDuration as totalDuration,
        CASE 
          WHEN lp IS NOT NULL AND size(steps) > 0 THEN
            [s IN steps WHERE s IS NOT NULL | {
              stepNumber: s.stepNumber,
              title: s.title,
              description: s.description,
              estimatedDuration: s.estimatedDuration,
              resources: CASE WHEN s.resources IS NOT NULL THEN s.resources ELSE [] END,
              prerequisites: CASE WHEN s.prerequisites IS NOT NULL THEN s.prerequisites ELSE [] END
            }]
          ELSE []
        END as steps
    `;

    try {
      const result = (await this.neo4jService.read(cypher, { userId })) as Array<Record<string, any>>;

      if (!result || result.length === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const record = result[0];

      // Check if user has a learning path
      if (!(record.learningPathId as string | null)) {
        throw new NotFoundException('Learning path not found for this user');
      }

      // Build the response object
      const response: GetLearningPathResponseDto = {
        id: record.learningPathId as string,
        userId: record.userId as string,
        learningGoal: record.learningGoal as string,
        status: ((record.status as string | undefined) || 'completed'),
        learningPath: null, // Will be set below based on status
        createdAt: record.createdAt as string,
        updatedAt: record.updatedAt as string,
      };

      // Add optional fields
      if (record.requestId as string | undefined) {
        response.requestId = record.requestId as string;
      }

      if (record.masteryScores as string | undefined) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          response.masteryScores = JSON.parse(record.masteryScores as string);
        } catch (parseError) {
          LoggerUtil.logError(
            this.logger,
            'LearningPathService',
            'Failed to parse masteryScores',
            parseError,
          );
        }
      }

      // Handle learning path details based on status
      if ((record.status as string | undefined) === 'processing') {
        response.learningPath = null;
      } else {
        // Build learning path details for completed/ready paths
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const recordSteps = record.steps;
        response.learningPath = {
          goal: record.learningGoal as string,
          difficultyLevel: (record.difficultyLevel as string | undefined) || 'beginner',
          totalDuration: (record.totalDuration as string | undefined) || '0 hours',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          steps: recordSteps || [],
        };
      }

      LoggerUtil.logInfo(
        this.logger,
        'LearningPathService',
        'Successfully retrieved learning path',
        { userId, learningPathId: record.learningPathId as string, status: record.status as string },
      );

      return response;
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