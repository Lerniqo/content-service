/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './e2e-test-helper';

describe('SyllabusController (e2e)', () => {
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

  describe('GET /syllabus', () => {
    it('should return empty syllabus when no concepts exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/syllabus')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('syllabus');
      expect(response.body).toHaveProperty('totalConcepts');
      expect(response.body).toHaveProperty('retrievedAt');
      expect(response.body.syllabus).toEqual([]);
      expect(response.body.totalConcepts).toBe(0);
    });

    it('should return complete syllabus tree with all concepts', async () => {
      // Create test data - hierarchical structure
      const subject = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'subject-001',
        name: 'Mathematics',
        type: 'Subject',
        description: 'Core mathematics curriculum',
      });

      const matter = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'matter-001',
        name: 'Algebra',
        type: 'Matter',
        description: 'Algebraic concepts',
        parentId: subject.conceptId,
      });

      await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'molecule-001',
        name: 'Linear Equations',
        type: 'Molecule',
        description: 'Linear equation concepts',
        parentId: matter.conceptId,
      });

      const response = await request(app.getHttpServer())
        .get('/syllabus')
        .expect(HttpStatus.OK);

      expect(response.body.totalConcepts).toBe(3);
      expect(response.body.syllabus).toHaveLength(1); // One root node (Subject)

      const rootNode = response.body.syllabus[0];
      expect(rootNode.conceptId).toBe('subject-001');
      expect(rootNode.name).toBe('Mathematics');
      expect(rootNode.type).toBe('Subject');
      expect(rootNode.children).toHaveLength(1);

      const matterNode = rootNode.children[0];
      expect(matterNode.conceptId).toBe('matter-001');
      expect(matterNode.name).toBe('Algebra');
      expect(matterNode.children).toHaveLength(1);

      const moleculeNode = matterNode.children[0];
      expect(moleculeNode.conceptId).toBe('molecule-001');
      expect(moleculeNode.name).toBe('Linear Equations');
      expect(moleculeNode.children).toEqual([]);
    });

    it('should return multiple root nodes when multiple subjects exist', async () => {
      await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'subject-001',
        name: 'Mathematics',
        type: 'Subject',
      });

      await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'subject-002',
        name: 'Science',
        type: 'Subject',
      });

      const response = await request(app.getHttpServer())
        .get('/syllabus')
        .expect(HttpStatus.OK);

      expect(response.body.totalConcepts).toBe(2);
      expect(response.body.syllabus).toHaveLength(2);

      const conceptIds = response.body.syllabus.map((c: any) => c.conceptId);
      expect(conceptIds).toContain('subject-001');
      expect(conceptIds).toContain('subject-002');
    });
  });

  describe('GET /syllabus/:id', () => {
    it('should return a specific syllabus concept by ID', async () => {
      const concept = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'test-concept-001',
        name: 'Test Concept',
        type: 'Subject',
        description: 'Test description',
      });

      const response = await request(app.getHttpServer())
        .get(`/syllabus/${concept.conceptId}`)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(concept.conceptId);
      expect(response.body.name).toBe('Test Concept');
      expect(response.body.type).toBe('Subject');
      expect(response.body.description).toBe('Test description');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 when concept does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/syllabus/non-existent-id')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toContain('not found');
    });

    it('should return concept with children', async () => {
      const parent = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'parent-001',
        name: 'Parent Concept',
        type: 'Subject',
      });

      const child = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'child-001',
        name: 'Child Concept',
        type: 'Matter',
        parentId: parent.conceptId,
      });

      const response = await request(app.getHttpServer())
        .get(`/syllabus/${parent.conceptId}`)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(parent.conceptId);
      expect(response.body.children).toHaveLength(1);
      expect(response.body.children[0].conceptId).toBe(child.conceptId);
    });
  });

  describe('POST /syllabus', () => {
    it('should create a new syllabus concept without parent', async () => {
      const createDto = {
        name: 'New Subject',
        type: 'Subject',
        description: 'A new subject',
      };

      const response = await request(app.getHttpServer())
        .post('/syllabus')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('conceptId');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.type).toBe(createDto.type);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body).toHaveProperty('createdAt');

      // Verify in database
      const exists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        response.body.conceptId,
      );
      expect(exists).toBe(true);
    });

    it('should create a new syllabus concept with parent', async () => {
      const parent = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'parent-001',
        name: 'Parent Subject',
        type: 'Subject',
      });

      const createDto = {
        name: 'Child Matter',
        type: 'Matter',
        description: 'A child concept',
        parentId: parent.conceptId,
      };

      const response = await request(app.getHttpServer())
        .post('/syllabus')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('conceptId');
      expect(response.body.name).toBe(createDto.name);

      // Verify relationship in database
      const hasRelationship = await E2ETestHelper.relationshipExists(
        'SyllabusConcept',
        'conceptId',
        parent.conceptId,
        'CONTAINS',
        'SyllabusConcept',
        'conceptId',
        response.body.conceptId,
      );
      expect(hasRelationship).toBe(true);
    });

    it('should return 400 for invalid input', async () => {
      const invalidDto = {
        name: '', // Empty name
        type: 'InvalidType',
      };

      await request(app.getHttpServer())
        .post('/syllabus')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 when parent concept does not exist', async () => {
      const createDto = {
        name: 'Child Concept',
        type: 'Matter',
        parentId: 'non-existent-parent',
      };

      const response = await request(app.getHttpServer())
        .post('/syllabus')
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toContain('Parent concept');
    });
  });

  describe('PUT /syllabus/:id', () => {
    it('should update an existing syllabus concept', async () => {
      const concept = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'update-test-001',
        name: 'Original Name',
        type: 'Subject',
        description: 'Original description',
      });

      const updateDto = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/syllabus/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.conceptId).toBe(concept.conceptId);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.type).toBe('Subject'); // Type should remain unchanged

      // Verify in database
      const updated = await E2ETestHelper.getNode(
        'SyllabusConcept',
        'conceptId',
        concept.conceptId,
      );
      expect(updated.name).toBe('Updated Name');
    });

    it('should update concept type', async () => {
      const concept = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'update-test-002',
        name: 'Test Concept',
        type: 'Subject',
      });

      const updateDto = {
        type: 'Matter',
      };

      const response = await request(app.getHttpServer())
        .put(`/syllabus/${concept.conceptId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.type).toBe('Matter');
    });

    it('should return 404 when concept does not exist', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put('/syllabus/non-existent-id')
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid update data', async () => {
      const concept = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'update-test-003',
        name: 'Test Concept',
        type: 'Subject',
      });

      const invalidDto = {
        type: 'InvalidType',
      };

      await request(app.getHttpServer())
        .put(`/syllabus/${concept.conceptId}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /syllabus/:id', () => {
    it('should delete a syllabus concept without children', async () => {
      const concept = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'delete-test-001',
        name: 'To Delete',
        type: 'Subject',
      });

      await request(app.getHttpServer())
        .delete(`/syllabus/${concept.conceptId}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify deleted from database
      const exists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        concept.conceptId,
      );
      expect(exists).toBe(false);
    });

    it('should delete concept and its children recursively', async () => {
      const parent = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'delete-parent-001',
        name: 'Parent',
        type: 'Subject',
      });

      const child1 = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'delete-child-001',
        name: 'Child 1',
        type: 'Matter',
        parentId: parent.conceptId,
      });

      const child2 = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'delete-child-002',
        name: 'Child 2',
        type: 'Matter',
        parentId: parent.conceptId,
      });

      const grandchild = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'delete-grandchild-001',
        name: 'Grandchild',
        type: 'Molecule',
        parentId: child1.conceptId,
      });

      await request(app.getHttpServer())
        .delete(`/syllabus/${parent.conceptId}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify all deleted from database
      const parentExists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        parent.conceptId,
      );
      const child1Exists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        child1.conceptId,
      );
      const child2Exists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        child2.conceptId,
      );
      const grandchildExists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        grandchild.conceptId,
      );

      expect(parentExists).toBe(false);
      expect(child1Exists).toBe(false);
      expect(child2Exists).toBe(false);
      expect(grandchildExists).toBe(false);
    });

    it('should return 404 when concept does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/syllabus/non-existent-id')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should handle deletion of leaf node in hierarchy', async () => {
      const parent = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'parent-leaf-001',
        name: 'Parent',
        type: 'Subject',
      });

      const child = await E2ETestHelper.createTestSyllabusConcept({
        conceptId: 'child-leaf-001',
        name: 'Child Leaf',
        type: 'Matter',
        parentId: parent.conceptId,
      });

      await request(app.getHttpServer())
        .delete(`/syllabus/${child.conceptId}`)
        .expect(HttpStatus.NO_CONTENT);

      // Parent should still exist
      const parentExists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        parent.conceptId,
      );
      expect(parentExists).toBe(true);

      // Child should be deleted
      const childExists = await E2ETestHelper.nodeExists(
        'SyllabusConcept',
        'conceptId',
        child.conceptId,
      );
      expect(childExists).toBe(false);
    });
  });
});
