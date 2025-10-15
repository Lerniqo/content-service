/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app/app.module';
import { Neo4jService } from '../src/common/neo4j/neo4j.service';
import { KafkaService } from '../src/common/kafka/kafka.service';

/**
 * Mock Kafka Service for E2E tests
 * Prevents actual Kafka connection attempts during testing
 */
class MockKafkaService {
  async onModuleInit() {
    // Do nothing - prevent Kafka connection
  }

  async sendEvent() {
    // Do nothing - mock event sending
    return Promise.resolve();
  }

  async subscribe() {
    // Do nothing - mock subscription
    return Promise.resolve();
  }
}

/**
 * Helper class for E2E testing with Neo4j
 * Provides utilities for database cleanup, test data creation, and common operations
 */
export class E2ETestHelper {
  static app: INestApplication;
  static neo4jService: Neo4jService;

  /**
   * Initialize the NestJS application for E2E testing
   */
  static async initializeApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KafkaService)
      .useClass(MockKafkaService)
      .compile();

    this.app = moduleFixture.createNestApplication();

    // Configure validation pipe (same as main.ts)
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        validationError: {
          target: false,
          value: false,
        },
      }),
    );

    await this.app.init();

    this.neo4jService = this.app.get(Neo4jService);

    return this.app;
  }

  /**
   * Close the application and connections
   */
  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * Clean up all test data from Neo4j database
   * BE CAREFUL: This deletes all nodes and relationships in the database
   */
  static async cleanDatabase(): Promise<void> {
    if (!this.neo4jService) {
      throw new Error(
        'Neo4jService not initialized. Call initializeApp() first.',
      );
    }

    // Delete all nodes and relationships
    const queries = [
      'MATCH (n:Question) DETACH DELETE n',
      'MATCH (n:Quiz) DETACH DELETE n',
      'MATCH (n:Resource) DETACH DELETE n',
      'MATCH (n:Concept) DETACH DELETE n',
      'MATCH (n:SyllabusConcept) DETACH DELETE n',
      'MATCH (n:User) DETACH DELETE n',
    ];

    for (const query of queries) {
      await this.neo4jService.write(query, {});
    }
  }

  /**
   * Create a test syllabus concept in the database
   */
  static async createTestSyllabusConcept(data: {
    conceptId?: string;
    name: string;
    type: string;
    description?: string;
    parentId?: string;
  }): Promise<any> {
    const conceptId = data.conceptId || `test-syllabus-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let query = `
      CREATE (c:SyllabusConcept {
        conceptId: $conceptId,
        name: $name,
        type: $type,
        description: $description,
        createdAt: $createdAt
      })
    `;

    const params: any = {
      conceptId,
      name: data.name,
      type: data.type,
      description: data.description || '',
      createdAt,
    };

    if (data.parentId) {
      query += `
        WITH c
        MATCH (parent:SyllabusConcept {conceptId: $parentId})
        CREATE (parent)-[:CONTAINS]->(c)
      `;
      params.parentId = data.parentId;
    }

    query += ' RETURN c';

    const result = await this.neo4jService.write(query, params);
    return result[0]?.c?.properties || result[0];
  }

  /**
   * Create a test concept in the database
   */
  static async createTestConcept(data: {
    conceptId?: string;
    name: string;
    type: string;
    description?: string;
    prerequisites?: string[];
  }): Promise<any> {
    const conceptId = data.conceptId || `test-concept-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let query = `
      CREATE (c:Concept {
        conceptId: $conceptId,
        name: $name,
        type: $type,
        description: $description,
        createdAt: $createdAt
      })
    `;

    const params: any = {
      conceptId,
      name: data.name,
      type: data.type,
      description: data.description || '',
      createdAt,
    };

    if (data.prerequisites && data.prerequisites.length > 0) {
      query += `
        WITH c
        UNWIND $prerequisites as prereqId
        MATCH (prereq:Concept {conceptId: prereqId})
        CREATE (c)-[:REQUIRES]->(prereq)
      `;
      params.prerequisites = data.prerequisites;
    }

    query += ' RETURN c';

    const result = await this.neo4jService.write(query, params);
    return result[0]?.c?.properties || result[0];
  }

  /**
   * Create a test question in the database
   */
  static async createTestQuestion(data: {
    id?: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    difficulty?: string;
    conceptId?: string;
  }): Promise<any> {
    const questionId = data.id || `test-question-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let query = `
      CREATE (q:Question {
        id: $id,
        questionText: $questionText,
        options: $options,
        correctAnswer: $correctAnswer,
        difficulty: $difficulty,
        createdAt: $createdAt
      })
    `;

    const params: any = {
      id: questionId,
      questionText: data.questionText,
      options: data.options,
      correctAnswer: data.correctAnswer,
      difficulty: data.difficulty || 'medium',
      createdAt,
    };

    if (data.conceptId) {
      query += `
        WITH q
        MATCH (c:Concept {conceptId: $conceptId})
        CREATE (q)-[:BELONGS_TO]->(c)
      `;
      params.conceptId = data.conceptId;
    }

    query += ' RETURN q';

    const result = await this.neo4jService.write(query, params);
    return result[0]?.q?.properties || result[0];
  }

  /**
   * Create a test quiz in the database
   */
  static async createTestQuiz(data: {
    id?: string;
    title: string;
    description?: string;
    timeLimit: number;
    conceptId: string;
    questionIds?: string[];
    createdBy?: string;
  }): Promise<any> {
    const quizId = data.id || `test-quiz-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let query = `
      MATCH (c:Concept {conceptId: $conceptId})
      CREATE (q:Quiz {
        id: $id,
        title: $title,
        description: $description,
        timeLimit: $timeLimit,
        createdAt: $createdAt,
        createdBy: $createdBy
      })
      CREATE (q)-[:TESTS]->(c)
    `;

    const params: any = {
      id: quizId,
      title: data.title,
      description: data.description || '',
      timeLimit: data.timeLimit,
      createdAt,
      conceptId: data.conceptId,
      createdBy: data.createdBy || 'test-teacher-id',
    };

    if (data.questionIds && data.questionIds.length > 0) {
      query += `
        WITH q
        UNWIND $questionIds as qId
        MATCH (question:Question {id: qId})
        CREATE (q)-[:INCLUDES]->(question)
      `;
      params.questionIds = data.questionIds;
    }

    query += ' RETURN q';

    const result = await this.neo4jService.write(query, params);
    return result[0]?.q?.properties || result[0];
  }

  /**
   * Create a test resource in the database
   */
  static async createTestResource(data: {
    resourceId?: string;
    name: string;
    type: string;
    conceptIds?: string[];
    url?: string;
    uploadedBy?: string;
  }): Promise<any> {
    const resourceId = data.resourceId || `test-resource-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let query = `
      CREATE (r:Resource {
        resourceId: $resourceId,
        name: $name,
        type: $type,
        url: $url,
        createdAt: $createdAt,
        uploadedBy: $uploadedBy
      })
    `;

    const params: any = {
      resourceId,
      name: data.name,
      type: data.type,
      url: data.url || 'https://example.com/resource',
      createdAt,
      uploadedBy: data.uploadedBy || 'test-teacher-id',
    };

    if (data.conceptIds && data.conceptIds.length > 0) {
      query += `
        WITH r
        UNWIND $conceptIds as cId
        MATCH (c:Concept {conceptId: cId})
        CREATE (r)-[:SUPPORTS]->(c)
      `;
      params.conceptIds = data.conceptIds;
    }

    query += ' RETURN r';

    const result = await this.neo4jService.write(query, params);
    return result[0]?.r?.properties || result[0];
  }

  /**
   * Create a test user in the database
   */
  static async createTestUser(data: {
    id?: string;
    role?: string;
    email?: string;
  }): Promise<any> {
    const userId = data.id || `test-user-${Date.now()}`;

    const query = `
      CREATE (u:User {
        id: $id,
        role: $role,
        email: $email,
        createdAt: $createdAt
      })
      RETURN u
    `;

    const params = {
      id: userId,
      role: data.role || 'teacher',
      email: data.email || `test-${userId}@example.com`,
      createdAt: new Date().toISOString(),
    };

    const result = await this.neo4jService.write(query, params);
    return result[0]?.u?.properties || result[0];
  }

  /**
   * Get mock authentication headers for testing
   */
  static getMockAuthHeaders(
    userId: string,
    role: string = 'teacher',
  ): Record<string, string> {
    return {
      'x-user-id': userId,
      'x-user-role': role,
    };
  }

  /**
   * Verify a node exists in the database
   */
  static async nodeExists(
    label: string,
    property: string,
    value: string,
  ): Promise<boolean> {
    const query = `MATCH (n:${label} {${property}: $value}) RETURN count(n) as count`;
    const result = await this.neo4jService.read(query, { value });
    return result[0]?.count > 0;
  }

  /**
   * Get a node from the database
   */
  static async getNode(
    label: string,
    property: string,
    value: string,
  ): Promise<any> {
    const query = `MATCH (n:${label} {${property}: $value}) RETURN n`;
    const result = await this.neo4jService.read(query, { value });
    return result[0]?.n?.properties || result[0]?.n || null;
  }

  /**
   * Count nodes with a specific label
   */
  static async countNodes(label: string): Promise<number> {
    const query = `MATCH (n:${label}) RETURN count(n) as count`;
    const result = await this.neo4jService.read(query, {});
    return result[0]?.count || 0;
  }

  /**
   * Verify a relationship exists between two nodes
   */
  static async relationshipExists(
    fromLabel: string,
    fromProperty: string,
    fromValue: string,
    relationshipType: string,
    toLabel: string,
    toProperty: string,
    toValue: string,
  ): Promise<boolean> {
    const query = `
      MATCH (from:${fromLabel} {${fromProperty}: $fromValue})-[r:${relationshipType}]->(to:${toLabel} {${toProperty}: $toValue})
      RETURN count(r) as count
    `;
    const result = await this.neo4jService.read(query, { fromValue, toValue });
    return result[0]?.count > 0;
  }
}
