import { Injectable, OnModuleInit } from '@nestjs/common';
import { EachMessagePayload } from 'kafkajs';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { KafkaService, MessageHandler } from '../kafka.service';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { LoggerUtil } from '../../utils/logger.util';

/**
 * Interface for individual concept mastery data
 */
export interface ConceptMastery {
  name: string;
  mastery_score: number;
}

/**
 * Interface for incoming mastery update message
 */
export interface MasteryUpdateMessage {
  studentId: string;
  concepts: ConceptMastery[];
}

@Injectable()
export class UpdateMasteryConsumer implements OnModuleInit {
  private readonly context = 'UpdateMasteryConsumer';

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly neo4jService: Neo4jService,
    @InjectPinoLogger(UpdateMasteryConsumer.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const messageHandler: MessageHandler =
        this.handleMasteryMessage.bind(this);
      await this.kafkaService.subscribe(
        ['mastery'],
        {
          groupId: 'content-service-mastery-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
        },
        messageHandler,
      );

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Mastery consumer initialized successfully',
        { topic: 'mastery' },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to initialize mastery consumer',
        error,
      );
      throw error;
    }
  }

  /**
   * Handles incoming mastery update messages from Kafka
   */
  private async handleMasteryMessage(
    payload: EachMessagePayload,
  ): Promise<void> {
    try {
      const { topic, partition, message } = payload;

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Processing mastery update message',
        {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
        },
      );

      // Parse the message value
      const messageValue = message.value?.toString();
      if (!messageValue) {
        throw new Error('Message value is empty');
      }

      const masteryData = JSON.parse(messageValue) as MasteryUpdateMessage;

      // Validate the message structure
      this.validateMasteryMessage(masteryData);

      // Update mastery relationships in Neo4j
      await this.updateMasteryRelationships(masteryData);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Mastery update processed successfully',
        {
          studentId: masteryData.studentId,
          conceptCount: masteryData.concepts.length,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to process mastery update message',
        error,
        {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
        },
      );
      throw error;
    }
  }

  /**
   * Validates the structure of the mastery update message
   */
  private validateMasteryMessage(
    data: any,
  ): asserts data is MasteryUpdateMessage {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid message format: expected object');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!data.studentId || typeof data.studentId !== 'string') {
      throw new Error('Invalid or missing studentId');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!Array.isArray(data.concepts)) {
      throw new Error('Invalid or missing concepts array');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    for (const [index, concept] of data.concepts.entries()) {
      if (!concept || typeof concept !== 'object') {
        throw new Error(`Invalid concept at index ${index}: expected object`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!concept.name || typeof concept.name !== 'string') {
        throw new Error(`Invalid concept name at index ${index}`);
      }

      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof concept.mastery_score !== 'number' ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        concept.mastery_score < 0 ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        concept.mastery_score > 100
      ) {
        throw new Error(
          `Invalid mastery_score at index ${index}: must be a number between 0 and 100`,
        );
      }
    }
  }

  /**
   * Updates mastery relationships in Neo4j database
   */
  private async updateMasteryRelationships(
    masteryData: MasteryUpdateMessage,
  ): Promise<void> {
    const { studentId, concepts } = masteryData;

    LoggerUtil.logDebug(
      this.logger,
      this.context,
      'Updating mastery relationships in Neo4j',
      {
        studentId,
        conceptCount: concepts.length,
      },
    );

    // Create or update HAS_MASTERED relationships for each concept
    for (const concept of concepts) {
      await this.createOrUpdateMasteryRelationship(studentId, concept);
    }
  }

  /**
   * Creates or updates a single mastery relationship between student and concept
   */
  private async createOrUpdateMasteryRelationship(
    studentId: string,
    concept: ConceptMastery,
  ): Promise<void> {
    const cypher = `
      MERGE (s:Student {id: $studentId})
      MERGE (c:Concept {name: $conceptName})
      MERGE (s)-[r:HAS_MASTERED]->(c)
      SET r.mastery_score = $masteryScore,
          r.updated_at = datetime()
      RETURN s.id as studentId, c.name as conceptName, r.mastery_score as masteryScore
    `;

    const params = {
      studentId,
      conceptName: concept.name,
      masteryScore: concept.mastery_score,
    };

    try {
      const result = (await this.neo4jService.write(cypher, params)) as Array<
        Record<string, any>
      >;

      LoggerUtil.logDebug(
        this.logger,
        this.context,
        'Mastery relationship updated successfully',
        {
          studentId,
          conceptName: concept.name,
          masteryScore: concept.mastery_score,
          resultCount: result.length,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to update mastery relationship',
        error,
        {
          studentId,
          conceptName: concept.name,
          masteryScore: concept.mastery_score,
        },
      );
      throw error;
    }
  }
}
