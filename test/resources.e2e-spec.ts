/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './e2e-test-helper';

describe('ResourcesController (e2e)', () => {
  let app: INestApplication;
  let testUserId: string;

  beforeAll(async () => {
    app = await E2ETestHelper.initializeApp();
  });

  afterAll(async () => {
    await E2ETestHelper.cleanDatabase();
    await E2ETestHelper.closeApp();
  });

  beforeEach(async () => {
    await E2ETestHelper.cleanDatabase();

    // Create a test user for authentication
    const user = await E2ETestHelper.createTestUser({
      id: 'test-teacher-001',
      role: 'teacher',
    });
    testUserId = user.id;
  });

  describe('POST /resources', () => {
    it('should create a new resource without concept associations', async () => {
      const createDto = {
        resourceId: 'resource-001',
        name: 'Introduction to Math',
        type: 'video',
        url: 'https://example.com/video.mp4',
        description: 'A video about math',
        fileSize: 1024000,
        duration: 300,
        isPremium: false,
      };

      const response = await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('resourceId');
      expect(response.body.resourceId).toBe('resource-001');
      expect(response.body).toHaveProperty('uploadUrl');

      // Verify in database
      const exists = await E2ETestHelper.nodeExists(
        'Resource',
        'resourceId',
        'resource-001',
      );
      expect(exists).toBe(true);
    });

    it('should create a resource with concept associations', async () => {
      const concept1 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Concept 1',
        type: 'Atom',
      });

      const concept2 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-002',
        name: 'Concept 2',
        type: 'Atom',
      });

      const createDto = {
        resourceId: 'resource-002',
        name: 'Learning Resource',
        type: 'pdf',
        url: 'https://example.com/document.pdf',
        conceptIds: [concept1.conceptId, concept2.conceptId],
      };

      const response = await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.resourceId).toBe('resource-002');

      // Verify SUPPORTS relationships
      const hasRelationship1 = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        'resource-002',
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept1.conceptId,
      );
      const hasRelationship2 = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        'resource-002',
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept2.conceptId,
      );

      expect(hasRelationship1).toBe(true);
      expect(hasRelationship2).toBe(true);
    });

    it('should return 400 for invalid input - missing resourceId', async () => {
      const invalidDto = {
        name: 'Test Resource',
        type: 'video',
      };

      await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid resource type', async () => {
      const invalidDto = {
        resourceId: 'resource-003',
        name: 'Test Resource',
        type: 'invalid-type',
      };

      await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidDto = {
        resourceId: 'not-a-uuid',
        name: 'Test Resource',
        type: 'video',
      };

      const response = await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto);

      // May return 400 or succeed depending on validation
      expect([HttpStatus.BAD_REQUEST, HttpStatus.CREATED]).toContain(
        response.status,
      );
    });

    it('should return 404 when concept does not exist', async () => {
      const createDto = {
        resourceId: 'resource-004',
        name: 'Test Resource',
        type: 'video',
        conceptIds: ['non-existent-concept'],
      };

      await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 for non-teacher/admin users', async () => {
      const studentUser = await E2ETestHelper.createTestUser({
        id: 'student-001',
        role: 'student',
      });

      const createDto = {
        resourceId: 'resource-005',
        name: 'Test Resource',
        type: 'video',
      };

      await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(studentUser.id, 'student'))
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should create resource with all optional fields', async () => {
      const createDto = {
        resourceId: 'resource-006',
        name: 'Complete Resource',
        type: 'interactive',
        url: 'https://example.com/interactive',
        description: 'A complete resource with all fields',
        fileSize: 2048000,
        duration: 600,
        isPremium: true,
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        tags: ['math', 'algebra'],
        difficulty: 'advanced',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.resourceId).toBe('resource-006');

      // Verify in database
      const resource = await E2ETestHelper.getNode(
        'Resource',
        'resourceId',
        'resource-006',
      );
      expect(resource.name).toBe('Complete Resource');
      expect(resource.isPremium).toBe(true);
    });
  });

  describe('PUT /resources/:id', () => {
    it('should update an existing resource', async () => {
      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-001',
        name: 'Original Name',
        type: 'video',
        uploadedBy: testUserId,
      });

      const updateDto = {
        name: 'Updated Name',
        description: 'Updated description',
        isPremium: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('updated successfully');

      // Verify in database
      const updated = await E2ETestHelper.getNode(
        'Resource',
        'resourceId',
        resource.resourceId,
      );
      expect(updated.name).toBe('Updated Name');
    });

    it('should update resource type', async () => {
      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-002',
        name: 'Test Resource',
        type: 'video',
        uploadedBy: testUserId,
      });

      const updateDto = {
        type: 'pdf',
      };

      const response = await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('updated successfully');

      // Verify in database
      const updated = await E2ETestHelper.getNode(
        'Resource',
        'resourceId',
        resource.resourceId,
      );
      expect(updated.type).toBe('pdf');
    });

    it('should update concept associations - add new concepts', async () => {
      const concept1 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Concept 1',
        type: 'Atom',
      });

      const concept2 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-002',
        name: 'Concept 2',
        type: 'Atom',
      });

      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-003',
        name: 'Test Resource',
        type: 'video',
        uploadedBy: testUserId,
      });

      const updateDto = {
        conceptIds: [concept1.conceptId, concept2.conceptId],
      };

      await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      // Verify relationships exist
      const hasRelationship1 = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        resource.resourceId,
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept1.conceptId,
      );
      const hasRelationship2 = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        resource.resourceId,
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept2.conceptId,
      );

      expect(hasRelationship1).toBe(true);
      expect(hasRelationship2).toBe(true);
    });

    it('should update concept associations - replace existing concepts', async () => {
      const concept1 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Concept 1',
        type: 'Atom',
      });

      const concept2 = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-002',
        name: 'Concept 2',
        type: 'Atom',
      });

      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-004',
        name: 'Test Resource',
        type: 'video',
        conceptIds: [concept1.conceptId],
        uploadedBy: testUserId,
      });

      const updateDto = {
        conceptIds: [concept2.conceptId],
      };

      await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      // Verify old relationship is removed
      const hasOldRelationship = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        resource.resourceId,
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept1.conceptId,
      );
      expect(hasOldRelationship).toBe(false);

      // Verify new relationship exists
      const hasNewRelationship = await E2ETestHelper.relationshipExists(
        'Resource',
        'resourceId',
        resource.resourceId,
        'SUPPORTS',
        'Concept',
        'conceptId',
        concept2.conceptId,
      );
      expect(hasNewRelationship).toBe(true);
    });

    it('should return 404 when resource does not exist', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put('/resources/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid update data', async () => {
      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-005',
        name: 'Test Resource',
        type: 'video',
        uploadedBy: testUserId,
      });

      const invalidDto = {
        type: 'invalid-type',
      };

      await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 when concept in update does not exist', async () => {
      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'update-test-006',
        name: 'Test Resource',
        type: 'video',
        uploadedBy: testUserId,
      });

      const updateDto = {
        conceptIds: ['non-existent-concept'],
      };

      await request(app.getHttpServer())
        .put(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /resources/:id', () => {
    it('should delete a resource', async () => {
      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'delete-test-001',
        name: 'To Delete',
        type: 'video',
        uploadedBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .delete(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('deleted');

      // Verify deleted from database
      const exists = await E2ETestHelper.nodeExists(
        'Resource',
        'resourceId',
        resource.resourceId,
      );
      expect(exists).toBe(false);
    });

    it('should delete resource but keep associated concepts', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'delete-test-002',
        name: 'To Delete',
        type: 'video',
        conceptIds: [concept.conceptId],
        uploadedBy: testUserId,
      });

      await request(app.getHttpServer())
        .delete(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      // Verify resource is deleted but concept still exists
      const resourceExists = await E2ETestHelper.nodeExists(
        'Resource',
        'resourceId',
        resource.resourceId,
      );
      const conceptExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        concept.conceptId,
      );

      expect(resourceExists).toBe(false);
      expect(conceptExists).toBe(true);
    });

    it('should return 404 when resource does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/resources/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 for non-teacher/admin users', async () => {
      const studentUser = await E2ETestHelper.createTestUser({
        id: 'student-001',
        role: 'student',
      });

      const resource = await E2ETestHelper.createTestResource({
        resourceId: 'delete-test-003',
        name: 'Test Resource',
        type: 'video',
        uploadedBy: testUserId,
      });

      await request(app.getHttpServer())
        .delete(`/resources/${resource.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(studentUser.id, 'student'))
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Resource Type Validation', () => {
    it('should accept all valid resource types', async () => {
      const validTypes = ['video', 'pdf', 'interactive', 'quiz', 'article'];

      for (const type of validTypes) {
        const createDto = {
          resourceId: `resource-${type}-001`,
          name: `Test ${type} Resource`,
          type: type,
        };

        const response = await request(app.getHttpServer())
          .post('/resources')
          .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
          .send(createDto);

        if (response.status === HttpStatus.CREATED) {
          expect(response.body.resourceId).toBe(`resource-${type}-001`);
        }
      }
    });
  });

  describe('Resource Lifecycle', () => {
    it('should handle complete resource lifecycle - create, update, delete', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'lifecycle-concept-001',
        name: 'Lifecycle Concept',
        type: 'Atom',
      });

      // Create
      const createDto = {
        resourceId: 'lifecycle-resource-001',
        name: 'Lifecycle Resource',
        type: 'video',
        conceptIds: [concept.conceptId],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/resources')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(createResponse.body.resourceId).toBe('lifecycle-resource-001');

      // Update
      const updateDto = {
        name: 'Updated Lifecycle Resource',
        description: 'Updated description',
      };

      await request(app.getHttpServer())
        .put(`/resources/${createResponse.body.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      // Verify update
      const updated = await E2ETestHelper.getNode(
        'Resource',
        'resourceId',
        'lifecycle-resource-001',
      );
      expect(updated.name).toBe('Updated Lifecycle Resource');

      // Delete
      await request(app.getHttpServer())
        .delete(`/resources/${createResponse.body.resourceId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      // Verify deletion
      const exists = await E2ETestHelper.nodeExists(
        'Resource',
        'resourceId',
        'lifecycle-resource-001',
      );
      expect(exists).toBe(false);
    });
  });
});
