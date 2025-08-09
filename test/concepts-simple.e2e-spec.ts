import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { Neo4jService } from '../src/common/neo4j/neo4j.service';

describe('ConceptsController (e2e) - Simple', () => {
  let app: INestApplication;
  let neo4jService: Neo4jService;

  const mockAdminUser = {
    id: 'admin-test-123',
    role: ['admin'],
    email: 'admin@test.com',
    name: 'Test Admin'
  };

  const mockNonAdminUser = {
    id: 'user-test-456',
    role: ['user'],
    email: 'user@test.com',
    name: 'Test User'
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    neo4jService = moduleFixture.get<Neo4jService>(Neo4jService);
    await app.init();
  });

  afterAll(async () => {
    // Clean up any remaining test data
    const session = neo4jService.getSession();
    try {
      await session.run('MATCH (c:Concept) WHERE c.id STARTS WITH "test-" DETACH DELETE c');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    } finally {
      await session.close();
    }
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /concepts - Basic Tests', () => {
    it('should create a concept with admin role', async () => {
      const conceptDto = {
        id: 'test-simple-concept-' + Date.now(),
        name: 'Simple Test Concept',
        type: 'Matter'
      };

      const response = await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(conceptDto)
        .expect(201);

      expect(response.body).toBeDefined();

      // Clean up
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: conceptDto.id
        });
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      } finally {
        await session.close();
      }
    });

    it('should reject request from non-admin user', () => {
      const conceptDto = {
        id: 'test-reject-concept-' + Date.now(),
        name: 'Reject Test Concept',
        type: 'Matter'
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(conceptDto)
        .expect(403);
    });

    it('should validate required fields', () => {
      const invalidDto = {
        name: 'Test Concept'
        // Missing id and type
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400);
    });

    it('should validate type enum values', () => {
      const invalidDto = {
        id: 'test-invalid-type-' + Date.now(),
        name: 'Test Concept',
        type: 'InvalidType'
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400);
    });

    it('should create concept without parent', async () => {
      const conceptDto = {
        id: 'test-no-parent-' + Date.now(),
        name: 'Independent Concept',
        type: 'Atom'
      };

      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(conceptDto)
        .expect(201);

      // Clean up
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: conceptDto.id
        });
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      } finally {
        await session.close();
      }
    });

    it('should validate all CONCEPT_TYPES enum values', async () => {
      const conceptTypes = ['Matter', 'Molecule', 'Atom', 'Particle'];
      
      for (const conceptType of conceptTypes) {
        const conceptDto = {
          id: `test-${conceptType.toLowerCase()}-${Date.now()}`,
          name: `Test ${conceptType}`,
          type: conceptType
        };

        await request(app.getHttpServer())
          .post('/concepts')
          .set('user', JSON.stringify(mockAdminUser))
          .send(conceptDto)
          .expect(201);

        // Clean up each concept
        const session = neo4jService.getSession();
        try {
          await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
            id: conceptDto.id
          });
        } catch (error) {
          console.warn('Cleanup warning:', error.message);
        } finally {
          await session.close();
        }
      }
    });
  });

  describe('PUT /concepts/:id - Update Tests', () => {
    let testConceptId: string;

    beforeEach(async () => {
      testConceptId = 'test-update-' + Date.now();
      
      // Create a test concept to update
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send({
          id: testConceptId,
          name: 'Original Test Matter',
          type: 'Matter'
        })
        .expect(201);
    });

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: testConceptId
        });
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      } finally {
        await session.close();
      }
    });

    it('should update a concept with admin role', () => {
      const updateDto = {
        name: 'Updated Test Matter',
        type: 'Molecule'
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.name).toBe('Updated Test Matter');
        });
    });

    it('should reject update from non-admin user', () => {
      const updateDto = {
        name: 'Updated Test Matter',
        type: 'Molecule'
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(updateDto)
        .expect(403);
    });

    it('should update concept with partial data', () => {
      const partialUpdateDto = {
        name: 'Partially Updated Name'
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(partialUpdateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Partially Updated Name');
        });
    });

    it('should handle concept not found error', () => {
      return request(app.getHttpServer())
        .put('/concepts/non-existent-concept-999')
        .set('user', JSON.stringify(mockAdminUser))
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('POST /concepts/:id/prerequisites - Prerequisites Tests', () => {
    let testConceptId: string;
    let testPrerequisiteId: string;

    beforeEach(async () => {
      testConceptId = 'test-concept-prereq-' + Date.now();
      testPrerequisiteId = 'test-prerequisite-' + Date.now();
      
      // Create test concepts
      const session = neo4jService.getSession();
      try {
        await session.run(`
          CREATE (c1:Concept {id: $conceptId, name: 'Test Concept', type: 'Matter'})
          CREATE (c2:Concept {id: $prerequisiteId, name: 'Test Prerequisite', type: 'Matter'})
        `, {
          conceptId: testConceptId,
          prerequisiteId: testPrerequisiteId
        });
      } catch (error) {
        console.warn('Setup warning:', error.message);
      } finally {
        await session.close();
      }
    });

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run(`
          MATCH (c:Concept) 
          WHERE c.id IN [$conceptId, $prerequisiteId] 
          DETACH DELETE c
        `, {
          conceptId: testConceptId,
          prerequisiteId: testPrerequisiteId
        });
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      } finally {
        await session.close();
      }
    });

    it('should create a prerequisite relationship with admin role', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId
      };

      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('successfully');
        });
    });

    it('should reject request from non-admin user', () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId
      };

      return request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(prerequisiteDto)
        .expect(403);
    });

    it('should return 400 for missing prerequisiteId', () => {
      return request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent concept', () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId
      };

      return request(app.getHttpServer())
        .post(`/concepts/non-existent-concept/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(404);
    });

    it('should return 404 for non-existent prerequisite', () => {
      const prerequisiteDto = {
        prerequisiteId: 'non-existent-prerequisite'
      };

      return request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(404);
    });
  });
});
