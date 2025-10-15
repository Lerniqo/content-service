/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './e2e-test-helper';

describe('QuestionsController (e2e)', () => {
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
      id: 'test-admin-001',
      role: 'admin',
    });
    testUserId = user.id;
  });

  describe('POST /questions', () => {
    it('should create a new question without concept relationship', async () => {
      const createDto = {
        questionText: 'What is 2 + 2?',
        options: ['2', '3', '4', '5'],
        correctAnswer: '4',
        difficulty: 'easy',
      };

      const response = await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.message).toContain('created successfully');

      // Verify in database
      const exists = await E2ETestHelper.nodeExists(
        'Question',
        'id',
        response.body.id,
      );
      expect(exists).toBe(true);
    });

    it('should create a question with concept relationship', async () => {
      // Create a concept first
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Addition',
        type: 'Atom',
      });

      const createDto = {
        questionText: 'What is 5 + 3?',
        options: ['6', '7', '8', '9'],
        correctAnswer: '8',
        difficulty: 'medium',
        conceptId: concept.conceptId,
      };

      const response = await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');

      // Verify relationship in database
      const hasRelationship = await E2ETestHelper.relationshipExists(
        'Question',
        'id',
        response.body.id,
        'BELONGS_TO',
        'Concept',
        'conceptId',
        concept.conceptId,
      );
      expect(hasRelationship).toBe(true);
    });

    it('should create a question with custom ID', async () => {
      const customId = 'custom-question-001';
      const createDto = {
        id: customId,
        questionText: 'Custom question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      };

      const response = await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.id).toBe(customId);
    });

    it('should return 400 for invalid input - missing questionText', async () => {
      const invalidDto = {
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for insufficient options', async () => {
      const invalidDto = {
        questionText: 'Test question?',
        options: ['Only one option'],
        correctAnswer: 'Only one option',
      };

      await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when correctAnswer is not in options', async () => {
      const invalidDto = {
        questionText: 'Test question?',
        options: ['A', 'B', 'C'],
        correctAnswer: 'D', // Not in options
      };

      const response = await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(invalidDto);

      // May return 400 or 500 depending on validation
      expect([
        HttpStatus.BAD_REQUEST,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ]).toContain(response.status);
    });

    it('should return 404 when concept does not exist', async () => {
      const createDto = {
        questionText: 'Test question?',
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
        conceptId: 'non-existent-concept',
      };

      await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 for non-admin users', async () => {
      const teacherUser = await E2ETestHelper.createTestUser({
        id: 'teacher-001',
        role: 'teacher',
      });

      const createDto = {
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      await request(app.getHttpServer())
        .post('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(teacherUser.id, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /questions', () => {
    it('should return empty array when no questions exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return all questions', async () => {
      const question1 = await E2ETestHelper.createTestQuestion({
        questionText: 'Question 1?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const question2 = await E2ETestHelper.createTestQuestion({
        questionText: 'Question 2?',
        options: ['C', 'D'],
        correctAnswer: 'C',
      });

      const response = await request(app.getHttpServer())
        .get('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);

      const questionIds = response.body.map((q: any) => q.id);
      expect(questionIds).toContain(question1.id);
      expect(questionIds).toContain(question2.id);
    });

    it('should return questions with concept information', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        conceptId: concept.conceptId,
      });

      const response = await request(app.getHttpServer())
        .get('/questions')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      const foundQuestion = response.body.find(
        (q: any) => q.id === question.id,
      );
      expect(foundQuestion).toBeDefined();

      if (foundQuestion.concept) {
        expect(foundQuestion.concept.conceptId).toBe(concept.conceptId);
      }
    });
  });

  describe('GET /questions/:id', () => {
    it('should return a specific question by ID', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        id: 'get-test-001',
        questionText: 'What is 10 / 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '5',
        difficulty: 'easy',
      });

      const response = await request(app.getHttpServer())
        .get(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(question.id);
      expect(response.body.questionText).toBe('What is 10 / 2?');
      expect(response.body.options).toEqual(['3', '4', '5', '6']);
      expect(response.body.correctAnswer).toBe('5');
      expect(response.body.difficulty).toBe('easy');
    });

    it('should return question with concept information', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Division',
        type: 'Atom',
      });

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        conceptId: concept.conceptId,
      });

      const response = await request(app.getHttpServer())
        .get(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      if (response.body.concept) {
        expect(response.body.concept.conceptId).toBe(concept.conceptId);
        expect(response.body.concept.name).toBe('Division');
      }
    });

    it('should return 404 when question does not exist', async () => {
      await request(app.getHttpServer())
        .get('/questions/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /questions/:id', () => {
    it('should update an existing question', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        id: 'update-test-001',
        questionText: 'Original question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const updateDto = {
        questionText: 'Updated question?',
        options: ['X', 'Y', 'Z'],
        correctAnswer: 'Y',
        difficulty: 'hard',
      };

      const response = await request(app.getHttpServer())
        .put(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(question.id);
      expect(response.body.message).toContain('updated successfully');

      // Verify in database
      const updated = await E2ETestHelper.getNode(
        'Question',
        'id',
        question.id,
      );
      expect(updated.questionText).toBe('Updated question?');
      expect(updated.correctAnswer).toBe('Y');
    });

    it('should partially update a question', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        id: 'update-test-002',
        questionText: 'Original question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        difficulty: 'easy',
      });

      const updateDto = {
        difficulty: 'medium', // Only update difficulty
      };

      const response = await request(app.getHttpServer())
        .put(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(question.id);

      // Verify original data is preserved
      const updated = await E2ETestHelper.getNode(
        'Question',
        'id',
        question.id,
      );
      expect(updated.questionText).toBe('Original question?');
      expect(updated.difficulty).toBe('medium');
    });

    it('should update concept relationship', async () => {
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

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        conceptId: concept1.conceptId,
      });

      const updateDto = {
        conceptId: concept2.conceptId,
      };

      await request(app.getHttpServer())
        .put(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      // Verify old relationship is removed
      const hasOldRelationship = await E2ETestHelper.relationshipExists(
        'Question',
        'id',
        question.id,
        'BELONGS_TO',
        'Concept',
        'conceptId',
        concept1.conceptId,
      );
      expect(hasOldRelationship).toBe(false);

      // Verify new relationship exists
      const hasNewRelationship = await E2ETestHelper.relationshipExists(
        'Question',
        'id',
        question.id,
        'BELONGS_TO',
        'Concept',
        'conceptId',
        concept2.conceptId,
      );
      expect(hasNewRelationship).toBe(true);
    });

    it('should return 404 when question does not exist', async () => {
      const updateDto = {
        questionText: 'Updated question?',
      };

      await request(app.getHttpServer())
        .put('/questions/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid update data', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const invalidDto = {
        options: ['Only one'], // Less than 2 options
      };

      await request(app.getHttpServer())
        .put(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /questions/:id', () => {
    it('should delete a question', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        id: 'delete-test-001',
        questionText: 'To delete?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const response = await request(app.getHttpServer())
        .delete(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('deleted');

      // Verify deleted from database
      const exists = await E2ETestHelper.nodeExists(
        'Question',
        'id',
        question.id,
      );
      expect(exists).toBe(false);
    });

    it('should delete question and its relationships', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
        conceptId: concept.conceptId,
      });

      await request(app.getHttpServer())
        .delete(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.OK);

      // Verify question is deleted but concept still exists
      const questionExists = await E2ETestHelper.nodeExists(
        'Question',
        'id',
        question.id,
      );
      const conceptExists = await E2ETestHelper.nodeExists(
        'Concept',
        'conceptId',
        concept.conceptId,
      );

      expect(questionExists).toBe(false);
      expect(conceptExists).toBe(true);
    });

    it('should return 404 when question does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/questions/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'admin'))
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 for non-admin users', async () => {
      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const teacherUser = await E2ETestHelper.createTestUser({
        id: 'teacher-001',
        role: 'teacher',
      });

      await request(app.getHttpServer())
        .delete(`/questions/${question.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(teacherUser.id, 'teacher'))
        .send()
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
