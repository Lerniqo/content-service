import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { Neo4jService } from '../src/common/neo4j/neo4j.service';

describe('ConceptsController (e2e)', () => {
  let app: INestApplication;
  let neo4jService: Neo4jService;

  const mockAdminUser = {
    id: 'admin-test-123',
    role: ['admin'],
    email: 'admin@test.com',
    name: 'Test Admin',
  };

  const mockNonAdminUser = {
    id: 'user-test-456',
    role: ['user'],
    email: 'user@test.com',
    name: 'Test User',
  };

  // Mock JWT guard to simulate authenticated requests
  const mockJwtGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard('JwtGuard') // If you have a JWT guard
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    neo4jService = moduleFixture.get<Neo4jService>(Neo4jService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /concepts', () => {
    const validCreateConceptDto = {
      id: 'test-concept-123',
      name: 'Test Matter',
      type: 'Matter',
      // Removed parentId to avoid parent dependency issues
    };

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: validCreateConceptDto.id,
        });
      } catch (error) {
        // Ignore cleanup errors
      } finally {
        await session.close();
      }
    });

    it('should create a concept with admin role', () => {
      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser)) // Simulate user in request
        .send(validCreateConceptDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toBeDefined();
          // Add more specific assertions based on your service response
        });
    });

    it('should reject request without admin role', () => {
      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(validCreateConceptDto)
        .expect(403); // Forbidden
    });

    it('should validate required fields', () => {
      const invalidDto = {
        // Missing required fields
        name: 'Test Concept',
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('ID')),
          ).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('Type')),
          ).toBe(true);
        });
    });

    it('should validate id field requirements', () => {
      const invalidDto = {
        id: '', // Empty id
        name: 'Test Concept',
        type: 'Matter',
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('ID')),
          ).toBe(true);
        });
    });

    it('should validate name field requirements', () => {
      const invalidDto = {
        id: 'test-concept-456',
        name: 'A', // Too short
        type: 'Matter',
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('Name')),
          ).toBe(true);
        });
    });

    it('should validate type field with enum values', () => {
      const invalidDto = {
        id: 'test-concept-789',
        name: 'Test Concept',
        type: 'InvalidType', // Not in CONCEPT_TYPES enum
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('Type')),
          ).toBe(true);
        });
    });

    it('should create concept without parentId', () => {
      const conceptWithoutParent = {
        id: 'test-concept-no-parent',
        name: 'Independent Concept',
        type: 'Atom',
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(conceptWithoutParent)
        .expect(201)
        .then(async () => {
          // Clean up
          const session = neo4jService.getSession();
          try {
            await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
              id: conceptWithoutParent.id,
            });
          } finally {
            await session.close();
          }
        });
    });

    it('should handle concept already exists error', async () => {
      // First, create a concept
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(validCreateConceptDto)
        .expect(201);

      // Try to create the same concept again
      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(validCreateConceptDto)
        .expect(400) // Changed from 500 to 400 as it should be a validation error
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should validate JSON payload format', () => {
      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send('invalid json string')
        .expect(400);
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .post('/concepts')
        .send(validCreateConceptDto)
        .expect(403); // Changed from 401 to 403 since the middleware provides a default user but roles guard should fail
    });

    it('should validate all CONCEPT_TYPES enum values', async () => {
      const conceptTypes = ['Matter', 'Molecule', 'Atom', 'Particle'];

      for (const conceptType of conceptTypes) {
        const conceptDto = {
          id: `test-${conceptType.toLowerCase()}-${Date.now()}`,
          name: `Test ${conceptType}`,
          type: conceptType,
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
            id: conceptDto.id,
          });
        } finally {
          await session.close();
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should check for @Roles("admin") decorator', async () => {
      const validDto = {
        id: 'auth-test-concept',
        name: 'Auth Test',
        type: 'Matter',
      };

      // Test with non-admin user should fail
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(validDto)
        .expect(403);

      // Test with admin user should succeed
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(validDto)
        .expect(201);

      // Clean up
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: validDto.id,
        });
      } finally {
        await session.close();
      }
    });
  });

  describe('PUT /concepts/:id', () => {
    const testConceptId = 'test-update-concept-123';
    const validUpdateConceptDto = {
      name: 'Updated Test Matter',
      type: 'Molecule',
      // Removed parentId to avoid dependency issues
    };

    beforeEach(async () => {
      // Create a test concept to update
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send({
          id: testConceptId,
          name: 'Original Test Matter',
          type: 'Matter',
          // Removed parentId to avoid dependency issues
        })
        .expect(201);
    });

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: testConceptId,
        });
      } catch (error) {
        // Ignore cleanup errors
      } finally {
        await session.close();
      }
    });

    it('should update a concept with admin role', () => {
      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(validUpdateConceptDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.name).toBe('Updated Test Matter');
          expect(res.body.type).toBe('Molecule');
        });
    });

    it('should reject update request without admin role', () => {
      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(validUpdateConceptDto)
        .expect(403); // Forbidden
    });

    it('should update concept with partial data', () => {
      const partialUpdateDto = {
        name: 'Partially Updated Name',
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
        .send(validUpdateConceptDto)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should validate type field with enum values on update', () => {
      const invalidUpdateDto = {
        name: 'Updated Concept',
        type: 'InvalidType', // Not in CONCEPT_TYPES enum
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidUpdateDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('Type')),
          ).toBe(true);
        });
    });

    it('should validate name field length on update', () => {
      const invalidUpdateDto = {
        name: 'A', // Too short
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidUpdateDto)
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(
            res.body.message.some((msg: string) => msg.includes('Name')),
          ).toBe(true);
        });
    });

    it('should handle removing parent relationship', () => {
      const removeParentDto = {
        name: 'Updated Name',
        parentId: '', // Empty string to remove parent
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(removeParentDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
        });
    });

    it('should handle invalid parent concept ID', () => {
      const invalidParentDto = {
        name: 'Updated Name',
        parentId: 'non-existent-parent-999',
      };

      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidParentDto)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Parent concept');
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .send(validUpdateConceptDto)
        .expect(403); // Changed from 401 to 403
    });

    it('should validate JSON payload format on update', () => {
      return request(app.getHttpServer())
        .put(`/concepts/${testConceptId}`)
        .set('user', JSON.stringify(mockAdminUser))
        .send('invalid json string')
        .expect(400);
    });

    it('should update with all valid CONCEPT_TYPES enum values', async () => {
      const conceptTypes = ['Matter', 'Molecule', 'Atom', 'Particle'];

      for (const conceptType of conceptTypes) {
        const updateDto = {
          name: `Updated ${conceptType}`,
          type: conceptType,
        };

        await request(app.getHttpServer())
          .put(`/concepts/${testConceptId}`)
          .set('user', JSON.stringify(mockAdminUser))
          .send(updateDto)
          .expect(200)
          .expect((res) => {
            expect(res.body.type).toBe(conceptType);
          });
      }
    });
  });

  describe('Authentication and Authorization for PUT', () => {
    it('should check for @Roles("admin") decorator on PUT endpoint', async () => {
      const testConceptId = 'auth-update-test-concept';
      const updateDto = {
        name: 'Auth Update Test',
        type: 'Matter',
      };

      // First create a concept to update
      await request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send({
          id: testConceptId,
          name: 'Original Auth Test',
          type: 'Atom',
        })
        .expect(201);

      try {
        // Test with non-admin user should fail
        await request(app.getHttpServer())
          .put(`/concepts/${testConceptId}`)
          .set('user', JSON.stringify(mockNonAdminUser))
          .send(updateDto)
          .expect(403);

        // Test with admin user should succeed
        await request(app.getHttpServer())
          .put(`/concepts/${testConceptId}`)
          .set('user', JSON.stringify(mockAdminUser))
          .send(updateDto)
          .expect(200);
      } finally {
        // Clean up
        const session = neo4jService.getSession();
        try {
          await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
            id: testConceptId,
          });
        } catch (error) {
          // Ignore cleanup errors
        } finally {
          await session.close();
        }
      }
    });
  });

  describe('POST /concepts/:id/prerequisites', () => {
    const testConceptId = 'test-concept-for-prerequisites';
    const testPrerequisiteId = 'test-prerequisite-concept';

    beforeEach(async () => {
      // Create test concepts
      const session = neo4jService.getSession();
      try {
        // Clean up any existing test data
        await session.run(
          `
          MATCH (c:Concept) 
          WHERE c.id IN [$conceptId, $prerequisiteId] 
          DETACH DELETE c
        `,
          {
            conceptId: testConceptId,
            prerequisiteId: testPrerequisiteId,
          },
        );

        // Create test concepts
        await session.run(
          `
          CREATE (c1:Concept {id: $conceptId, name: 'Test Concept', type: 'Matter'})
          CREATE (c2:Concept {id: $prerequisiteId, name: 'Test Prerequisite', type: 'Matter'})
        `,
          {
            conceptId: testConceptId,
            prerequisiteId: testPrerequisiteId,
          },
        );
      } finally {
        await session.close();
      }
    });

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run(
          `
          MATCH (c:Concept) 
          WHERE c.id IN [$conceptId, $prerequisiteId] 
          DETACH DELETE c
        `,
          {
            conceptId: testConceptId,
            prerequisiteId: testPrerequisiteId,
          },
        );
      } finally {
        await session.close();
      }
    });

    it('should create a prerequisite relationship with admin role', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId,
      };

      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Prerequisite relationship created successfully',
          });
        });

      // Verify the relationship was created in the database
      const session = neo4jService.getSession();
      try {
        const result = await session.run(
          `
          MATCH (c:Concept {id: $conceptId})-[r:HAS_PREREQUISITE]->(p:Concept {id: $prerequisiteId})
          RETURN r
        `,
          {
            conceptId: testConceptId,
            prerequisiteId: testPrerequisiteId,
          },
        );

        expect(result.records.length).toBe(1);
      } finally {
        await session.close();
      }
    });

    it('should reject request from non-admin user', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId,
      };

      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockNonAdminUser))
        .send(prerequisiteDto)
        .expect(403);
    });

    it('should return 400 for missing prerequisiteId', async () => {
      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send({})
        .expect(400);
    });

    it('should return 400 for empty prerequisiteId', async () => {
      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send({ prerequisiteId: '' })
        .expect(400);
    });

    it('should return 404 for non-existent concept', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId,
      };

      await request(app.getHttpServer())
        .post(`/concepts/non-existent-concept/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(404);
    });

    it('should return 404 for non-existent prerequisite', async () => {
      const prerequisiteDto = {
        prerequisiteId: 'non-existent-prerequisite',
      };

      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(404);
    });

    it('should return 400 when trying to create duplicate relationship', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId,
      };

      // Create the relationship first time
      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(200);

      // Try to create the same relationship again
      await request(app.getHttpServer())
        .post(`/concepts/${testConceptId}/prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(400);
    });

    it('should return 400 for invalid concept ID', async () => {
      const prerequisiteDto = {
        prerequisiteId: testPrerequisiteId,
      };

      await request(app.getHttpServer())
        .post(`/concepts/ /prerequisites`)
        .set('user', JSON.stringify(mockAdminUser))
        .send(prerequisiteDto)
        .expect(400);
    });
  });
});
