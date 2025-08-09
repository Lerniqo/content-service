import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Neo4jService } from '../src/common/neo4j/neo4j.service';

describe('ConceptsController (e2e)', () => {
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
      dependantConceptId: 'parent-concept-456'
    };

    afterEach(async () => {
      // Clean up test data
      const session = neo4jService.getSession();
      try {
        await session.run('MATCH (c:Concept {id: $id}) DETACH DELETE c', {
          id: validCreateConceptDto.id
        });
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
        name: 'Test Concept'
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('validation failed');
        });
    });

    it('should validate id field requirements', () => {
      const invalidDto = {
        id: '', // Empty id
        name: 'Test Concept',
        type: 'Matter'
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('ID is required');
        });
    });

    it('should validate name field requirements', () => {
      const invalidDto = {
        id: 'test-concept-456',
        name: 'A', // Too short
        type: 'Matter'
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Name must be between 2 and 255 characters');
        });
    });

    it('should validate type field with enum values', () => {
      const invalidDto = {
        id: 'test-concept-789',
        name: 'Test Concept',
        type: 'InvalidType' // Not in CONCEPT_TYPES enum
      };

      return request(app.getHttpServer())
        .post('/concepts')
        .set('user', JSON.stringify(mockAdminUser))
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Type must be one of: Matter, Molecule, Atom, Particle');
        });
    });

    it('should create concept without dependantConceptId', () => {
      const conceptWithoutParent = {
        id: 'test-concept-no-parent',
        name: 'Independent Concept',
        type: 'Atom'
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
              id: conceptWithoutParent.id
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
        .expect(500) // Or whatever error code your service returns
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
        .expect(401); // Unauthorized - if you have authentication
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
        type: 'Matter'
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
          id: validDto.id
        });
      } finally {
        await session.close();
      }
    });
  });
});
