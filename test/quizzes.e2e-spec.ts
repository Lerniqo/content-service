/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './e2e-test-helper';

describe('QuizzesController (e2e)', () => {
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

  describe('POST /quizzes', () => {
    it('should create a new quiz without questions', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const createDto = {
        title: 'Basic Quiz',
        description: 'A basic quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [],
      };

      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.description).toBe(createDto.description);
      expect(response.body.timeLimit).toBe(createDto.timeLimit);
      expect(response.body.conceptId).toBe(concept.conceptId);
      expect(response.body.questionIds).toEqual([]);

      // Verify in database
      const exists = await E2ETestHelper.nodeExists(
        'Quiz',
        'id',
        response.body.id,
      );
      expect(exists).toBe(true);

      // Verify TESTS relationship
      const hasTestsRelationship = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        response.body.id,
        'TESTS',
        'Concept',
        'conceptId',
        concept.conceptId,
      );
      expect(hasTestsRelationship).toBe(true);
    });

    it('should create a quiz with questions', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

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

      const createDto = {
        title: 'Quiz with Questions',
        description: 'Has multiple questions',
        timeLimit: 1800,
        conceptId: concept.conceptId,
        questionIds: [question1.id, question2.id],
      };

      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.questionIds).toHaveLength(2);
      expect(response.body.questionIds).toContain(question1.id);
      expect(response.body.questionIds).toContain(question2.id);

      // Verify INCLUDES relationships
      const hasIncludesRelationship1 = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        response.body.id,
        'INCLUDES',
        'Question',
        'id',
        question1.id,
      );
      const hasIncludesRelationship2 = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        response.body.id,
        'INCLUDES',
        'Question',
        'id',
        question2.id,
      );

      expect(hasIncludesRelationship1).toBe(true);
      expect(hasIncludesRelationship2).toBe(true);
    });

    it('should return 400 for invalid input - missing title', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const invalidDto = {
        description: 'No title',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [],
      };

      await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid timeLimit', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const invalidDto = {
        title: 'Test Quiz',
        timeLimit: 30, // Less than minimum 60 seconds
        conceptId: concept.conceptId,
        questionIds: [],
      };

      await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 when concept does not exist', async () => {
      const createDto = {
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: 'non-existent-concept',
        questionIds: [],
      };

      await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when question does not exist', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const createDto = {
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: ['non-existent-question'],
      };

      await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(createDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 403 for non-teacher/admin users', async () => {
      const studentUser = await E2ETestHelper.createTestUser({
        id: 'student-001',
        role: 'student',
      });

      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const createDto = {
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [],
      };

      await request(app.getHttpServer())
        .post('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(studentUser.id, 'student'))
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /quizzes', () => {
    it('should return empty array when no quizzes exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return all quizzes', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const quiz1 = await E2ETestHelper.createTestQuiz({
        title: 'Quiz 1',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const quiz2 = await E2ETestHelper.createTestQuiz({
        title: 'Quiz 2',
        timeLimit: 1800,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .get('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);

      const quizIds = response.body.map((q: any) => q.id);
      expect(quizIds).toContain(quiz1.id);
      expect(quizIds).toContain(quiz2.id);
    });

    it('should return quizzes with concept and questions information', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [question.id],
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .get('/quizzes')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      const foundQuiz = response.body.find((q: any) => q.id === quiz.id);
      expect(foundQuiz).toBeDefined();

      if (foundQuiz.concept) {
        expect(foundQuiz.concept.conceptId).toBe(concept.conceptId);
      }

      if (foundQuiz.questions) {
        expect(foundQuiz.questions).toHaveLength(1);
        expect(foundQuiz.questions[0].id).toBe(question.id);
      }
    });
  });

  describe('GET /quizzes/:id', () => {
    it('should return a specific quiz by ID', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        id: 'get-test-001',
        title: 'Test Quiz',
        description: 'Test description',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .get(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(quiz.id);
      expect(response.body.title).toBe('Test Quiz');
      expect(response.body.description).toBe('Test description');
      expect(response.body.timeLimit).toBe(3600);
    });

    it('should return quiz with questions and concept', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

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

      const quiz = await E2ETestHelper.createTestQuiz({
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [question1.id, question2.id],
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .get(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      if (response.body.questions) {
        expect(response.body.questions).toHaveLength(2);
      }

      if (response.body.concept) {
        expect(response.body.concept.conceptId).toBe(concept.conceptId);
      }
    });

    it('should return 404 when quiz does not exist', async () => {
      await request(app.getHttpServer())
        .get('/quizzes/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /quizzes/:id', () => {
    it('should update an existing quiz', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        id: 'update-test-001',
        title: 'Original Title',
        description: 'Original description',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const updateDto = {
        title: 'Updated Title',
        description: 'Updated description',
        timeLimit: 7200,
      };

      const response = await request(app.getHttpServer())
        .put(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(quiz.id);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.timeLimit).toBe(7200);

      // Verify in database
      const updated = await E2ETestHelper.getNode('Quiz', 'id', quiz.id);
      expect(updated.title).toBe('Updated Title');
    });

    it('should update quiz questions', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

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

      const question3 = await E2ETestHelper.createTestQuestion({
        questionText: 'Question 3?',
        options: ['E', 'F'],
        correctAnswer: 'E',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [question1.id],
        createdBy: testUserId,
      });

      const updateDto = {
        questionIds: [question2.id, question3.id],
      };

      const response = await request(app.getHttpServer())
        .put(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(quiz.id);

      // Verify old relationship is removed
      const hasOldRelationship = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        quiz.id,
        'INCLUDES',
        'Question',
        'id',
        question1.id,
      );
      expect(hasOldRelationship).toBe(false);

      // Verify new relationships exist
      const hasNewRelationship2 = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        quiz.id,
        'INCLUDES',
        'Question',
        'id',
        question2.id,
      );
      const hasNewRelationship3 = await E2ETestHelper.relationshipExists(
        'Quiz',
        'id',
        quiz.id,
        'INCLUDES',
        'Question',
        'id',
        question3.id,
      );

      expect(hasNewRelationship2).toBe(true);
      expect(hasNewRelationship3).toBe(true);
    });

    it('should return 404 when quiz does not exist', async () => {
      const updateDto = {
        title: 'Updated Title',
      };

      await request(app.getHttpServer())
        .put('/quizzes/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid update data', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        title: 'Test Quiz',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const invalidDto = {
        timeLimit: 30, // Less than minimum
      };

      await request(app.getHttpServer())
        .put(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /quizzes/:id', () => {
    it('should delete a quiz', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        id: 'delete-test-001',
        title: 'To Delete',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .delete(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(response.body.message).toContain('deleted');

      // Verify deleted from database
      const exists = await E2ETestHelper.nodeExists('Quiz', 'id', quiz.id);
      expect(exists).toBe(false);
    });

    it('should delete quiz but keep questions and concept', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const question = await E2ETestHelper.createTestQuestion({
        questionText: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      const quiz = await E2ETestHelper.createTestQuiz({
        title: 'To Delete',
        timeLimit: 3600,
        conceptId: concept.conceptId,
        questionIds: [question.id],
        createdBy: testUserId,
      });

      await request(app.getHttpServer())
        .delete(`/quizzes/${quiz.id}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      // Verify quiz is deleted but question and concept still exist
      const quizExists = await E2ETestHelper.nodeExists('Quiz', 'id', quiz.id);
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

      expect(quizExists).toBe(false);
      expect(questionExists).toBe(true);
      expect(conceptExists).toBe(true);
    });

    it('should return 404 when quiz does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/quizzes/non-existent-id')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /quizzes/concept/:conceptId', () => {
    it('should return all quizzes for a specific concept', async () => {
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

      const quiz1 = await E2ETestHelper.createTestQuiz({
        title: 'Quiz 1 for Concept 1',
        timeLimit: 3600,
        conceptId: concept1.conceptId,
        createdBy: testUserId,
      });

      const quiz2 = await E2ETestHelper.createTestQuiz({
        title: 'Quiz 2 for Concept 1',
        timeLimit: 1800,
        conceptId: concept1.conceptId,
        createdBy: testUserId,
      });

      const quiz3 = await E2ETestHelper.createTestQuiz({
        title: 'Quiz for Concept 2',
        timeLimit: 3600,
        conceptId: concept2.conceptId,
        createdBy: testUserId,
      });

      const response = await request(app.getHttpServer())
        .get(`/quizzes/concept/${concept1.conceptId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);

      const quizIds = response.body.map((q: any) => q.id);
      expect(quizIds).toContain(quiz1.id);
      expect(quizIds).toContain(quiz2.id);
      expect(quizIds).not.toContain(quiz3.id);
    });

    it('should return empty array when no quizzes exist for concept', async () => {
      const concept = await E2ETestHelper.createTestConcept({
        conceptId: 'concept-001',
        name: 'Test Concept',
        type: 'Atom',
      });

      const response = await request(app.getHttpServer())
        .get(`/quizzes/concept/${concept.conceptId}`)
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 404 when concept does not exist', async () => {
      await request(app.getHttpServer())
        .get('/quizzes/concept/non-existent-concept')
        .set(E2ETestHelper.getMockAuthHeaders(testUserId, 'teacher'))
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
