/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './e2e-test-helper';

describe('ConceptsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await E2ETestHelper.initializeApp();
  });

  afterAll(async () => {
    await E2ETestHelper.cleanDatabase();
    await E2ETestHelper.closeApp();
  });

  beforeEach(async () => {
    await E2ETestHelper.cleanDatabase();
  });

  describe('GET /concepts', () => {
    it('should return empty array when no concepts exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/concepts')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return all concepts with their prerequisites', async () => {
      const prerequisite = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Basic Addition',
        type: 'Particle',
        description: 'Learn addition',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Multiplication',
        type: 'Atom',
        description: 'Learn multiplication',
        prerequisites: [prerequisite.conceptId],
      });

      const response = await request(app.getHttpServer())
        .get('/concepts')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);

      const multiplicationConcept = response.body.find(
        (c: any) => c.conceptId === concept.conceptId,
      );
      expect(multiplicationConcept).toBeDefined();
      expect(multiplicationConcept.name).toBe('Multiplication');
      expect(multiplicationConcept.prerequisites).toHaveLength(1);
      expect(multiplicationConcept.prerequisites[0].conceptId).toBe(
        prerequisite.conceptId,
      );
    });

    it('should return concepts with empty prerequisites when they have none', async () => {
      await E2ETestHelper.createTestConcept({
        conceptId: 'standalone-001',
        name: 'Standalone Concept',
        type: 'Atom',
      });

      const response = await request(app.getHttpServer())
        .get('/concepts')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].prerequisites).toEqual([]);
    });

    it('should return concepts with multiple prerequisites', async () => {
      const prereq1 = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Prerequisite 1',
        type: 'Particle',
      });

      const prereq2 = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-002',
        name: 'Prerequisite 2',
        type: 'Particle',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Advanced Concept',
        type: 'Atom',
        prerequisites: [prereq1.conceptId, prereq2.conceptId],
      });

      const response = await request(app.getHttpServer())
        .get('/concepts')
        .expect(HttpStatus.OK);

      const advancedConcept = response.body.find(
        (c: any) => c.conceptId === concept.conceptId,
      );
      expect(advancedConcept.prerequisites).toHaveLength(2);

      const prereqIds = advancedConcept.prerequisites.map(
        (p: any) => p.conceptId,
      );
      expect(prereqIds).toContain(prereq1.conceptId);
      expect(prereqIds).toContain(prereq2.conceptId);
    });
  });

  describe('GET /concepts/:id', () => {
    it('should return a specific concept by ID', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'get-test-001',
        name: 'Test Concept',
        type: 'Atom',
        description: 'Test description',
      });

      const response = await request(app.getHttpServer())
        .get(`/concepts/${concept.conceptId}`)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(concept.conceptId);
      expect(response.body.name).toBe('Test Concept');
      expect(response.body.type).toBe('Atom');
      expect(response.body.description).toBe('Test description');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.prerequisites).toEqual([]);
    });

    it('should return concept with prerequisites', async () => {
      const prereq = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Prerequisite',
        type: 'Particle',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Main Concept',
        type: 'Atom',
        prerequisites: [prereq.conceptId],
      });

      const response = await request(app.getHttpServer())
        .get(`/concepts/${concept.conceptId}`)
        .expect(HttpStatus.OK);

      expect(response.body.prerequisites).toHaveLength(1);
      expect(response.body.prerequisites[0].conceptId).toBe(prereq.conceptId);
      expect(response.body.prerequisites[0].name).toBe('Prerequisite');
    });

    it('should return 404 when concept does not exist', async () => {
      await request(app.getHttpServer())
        .get('/concepts/non-existent-id')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /concepts', () => {
    it('should create a new concept without prerequisites', async () => {
      const createDto = {
        name: 'New Concept',
        type: 'Atom',
        description: 'A new concept',
      };

      const response = await request(app.getHttpServer())
        .post('/concepts')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('conceptId');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.type).toBe(createDto.type);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body).toHaveProperty('createdAt');

      // Verify in database
      const exists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        response.body.conceptId,
      );
      expect(exists).toBe(true);
    });

    it('should create a concept with prerequisites', async () => {
      const prereq1 = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Prerequisite 1',
        type: 'Particle',
      });

      const prereq2 = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-002',
        name: 'Prerequisite 2',
        type: 'Particle',
      });

      const createDto = {
        name: 'New Concept with Prerequisites',
        type: 'Atom',
        description: 'Has prerequisites',
        prerequisites: [prereq1.conceptId, prereq2.conceptId],
      };

      const response = await request(app.getHttpServer())
        .post('/concepts')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('conceptId');
      expect(response.body.name).toBe(createDto.name);

      // Verify prerequisites relationships in database
      const hasRelationship1 = await E2ETestHelper.relationshipExists(
        'Concept',
        'conceptId',
        response.body.conceptId,
        'REQUIRES',
        'Concept',
        'conceptId',
        prereq1.conceptId,
      );
      const hasRelationship2 = await E2ETestHelper.relationshipExists(
        'Concept',
        'conceptId',
        response.body.conceptId,
        'REQUIRES',
        'Concept',
        'conceptId',
        prereq2.conceptId,
      );

      expect(hasRelationship1).toBe(true);
      expect(hasRelationship2).toBe(true);
    });

    it('should return 400 for invalid input - missing name', async () => {
      const invalidDto = {
        type: 'Atom',
      };

      await request(app.getHttpServer())
        .post('/concepts')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid concept type', async () => {
      const invalidDto = {
        name: 'Test Concept',
        type: 'InvalidType',
      };

      await request(app.getHttpServer())
        .post('/concepts')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 when prerequisite concept does not exist', async () => {
      const createDto = {
        name: 'New Concept',
        type: 'Atom',
        prerequisites: ['non-existent-prereq'],
      };

      await request(app.getHttpServer())
        .post('/concepts')
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /concepts/:id', () => {
    it('should update an existing concept', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'update-test-001',
        name: 'Original Name',
        type: 'Atom',
        description: 'Original description',
      });

      const updateDto = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/concepts/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(concept.conceptId);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.type).toBe('Atom'); // Type should remain unchanged

      // Verify in database
      const updated = await E2ETestHelper.getNode(
        'Concept',
        'conceptId',
        concept.conceptId,
      );
      expect(updated.name).toBe('Updated Name');
    });

    it('should update concept type', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'update-test-002',
        name: 'Test Concept',
        type: 'Atom',
      });

      const updateDto = {
        type: 'Molecule',
      };

      const response = await request(app.getHttpServer())
        .put(`/concepts/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.type).toBe('Molecule');
    });

    it('should update prerequisites - add new prerequisites', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'update-test-003',
        name: 'Test Concept',
        type: 'Atom',
      });

      const prereq = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'New Prerequisite',
        type: 'Particle',
      });

      const updateDto = {
        prerequisites: [prereq.conceptId],
      };

      const response = await request(app.getHttpServer())
        .put(`/concepts/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(concept.conceptId);

      // Verify relationship exists
      const hasRelationship = await E2ETestHelper.relationshipExists(
        'Concept',
        'conceptId',
        concept.conceptId,
        'REQUIRES',
        'Concept',
        'conceptId',
        prereq.conceptId,
      );
      expect(hasRelationship).toBe(true);
    });

    it('should update prerequisites - remove existing prerequisites', async () => {
      const prereq = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Prerequisite',
        type: 'Particle',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'update-test-004',
        name: 'Test Concept',
        type: 'Atom',
        prerequisites: [prereq.conceptId],
      });

      const updateDto = {
        prerequisites: [], // Remove all prerequisites
      };

      await request(app.getHttpServer())
        .put(`/concepts/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      // Verify relationship is removed
      const hasRelationship = await E2ETestHelper.relationshipExists(
        'Concept',
        'conceptId',
        concept.conceptId,
        'REQUIRES',
        'Concept',
        'conceptId',
        prereq.conceptId,
      );
      expect(hasRelationship).toBe(false);
    });

    it('should return 404 when concept does not exist', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put('/concepts/non-existent-id')
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid update data', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'update-test-005',
        name: 'Test Concept',
        type: 'Atom',
      });

      const invalidDto = {
        type: 'InvalidType',
      };

      await request(app.getHttpServer())
        .put(`/concepts/${concept.conceptId}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /concepts/:id', () => {
    it('should delete a concept', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'delete-test-001',
        name: 'To Delete',
        type: 'Atom',
      });

      const response = await request(app.getHttpServer())
        .delete(`/concepts/${concept.conceptId}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('deleted');
      expect(response.body.deletedConceptId).toBe(concept.conceptId);

      // Verify deleted from database
      const exists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        concept.conceptId,
      );
      expect(exists).toBe(false);
    });

    it('should delete concept and its relationships', async () => {
      const prereq = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-delete-001',
        name: 'Prerequisite',
        type: 'Particle',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'delete-test-002',
        name: 'To Delete',
        type: 'Atom',
        prerequisites: [prereq.conceptId],
      });

      await request(app.getHttpServer())
        .delete(`/concepts/${concept.conceptId}`)
        .expect(HttpStatus.OK);

      // Verify concept is deleted but prerequisite still exists
      const conceptExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        concept.conceptId,
      );
      const prereqExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        prereq.conceptId,
      );

      expect(conceptExists).toBe(false);
      expect(prereqExists).toBe(true); // Prerequisite should still exist
    });

    it('should return 404 when concept does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/concepts/non-existent-id')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should allow deleting a concept that is a prerequisite for others', async () => {
      const prereq = await E2ETestHelper.createTestConcept({
        conceptId: 'prereq-001',
        name: 'Prerequisite',
        type: 'Particle',
      });

      const dependent = await E2ETestHelper.createTestConcept({
        conceptId: 'dependent-001',
        name: 'Dependent Concept',
        type: 'Atom',
        prerequisites: [prereq.conceptId],
      });

      // Delete the prerequisite
      await request(app.getHttpServer())
        .delete(`/concepts/${prereq.conceptId}`)
        .expect(HttpStatus.OK);

      // Verify prerequisite is deleted
      const prereqExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        prereq.conceptId,
      );
      expect(prereqExists).toBe(false);

      // Verify dependent concept still exists
      const dependentExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        dependent.conceptId,
      );
      expect(dependentExists).toBe(true);

      // Verify relationship is removed
      const hasRelationship = await E2ETestHelper.relationshipExists(
        'Concept',
        'conceptId',
        dependent.conceptId,
        'REQUIRES',
        'Concept',
        'conceptId',
        prereq.conceptId,
      );
      expect(hasRelationship).toBe(false);
    });
  });
});
