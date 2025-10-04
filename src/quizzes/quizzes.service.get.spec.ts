import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesService } from './quizzes.service';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException } from '@nestjs/common';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { QuizQuestionDto } from './dto/quiz-question.dto';

describe('QuizzesService - getQuizById', () => {
  let service: QuizzesService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  describe('getQuizById', () => {
    it('should return quiz with questions', async () => {
      // Arrange
      const quizId = 'test-quiz-id';
      const mockResult = [
        {
          id: 'test-quiz-id',
          title: 'Mathematics Quiz',
          description: 'Basic math quiz',
          timeLimit: 3600,
          createdAt: '2024-10-04T10:30:00Z',
          updatedAt: '2024-10-04T10:30:00Z',
          questions: [
            {
              id: 'question-1',
              questionText: 'What is 2 + 2?',
              options: ['2', '3', '4', '5'],
              correctAnswer: '4',
              explanation: 'Adding 2 + 2 equals 4',
              tags: ['math', 'addition'],
              createdAt: '2024-10-04T10:30:00Z',
              updatedAt: '2024-10-04T10:30:00Z',
            },
            {
              id: 'question-2',
              questionText: 'What is 3 * 3?',
              options: ['6', '8', '9', '12'],
              correctAnswer: '9',
              explanation: 'Multiplying 3 * 3 equals 9',
              tags: ['math', 'multiplication'],
              createdAt: '2024-10-04T10:30:00Z',
              updatedAt: '2024-10-04T10:30:00Z',
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockResult);

      // Act
      const result = await service.getQuizById(quizId);

      // Assert
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (q:Quiz {id: $quizId})'),
        { quizId },
      );
      expect(result).toBeInstanceOf(QuizResponseDto);
      expect(result.id).toBe(quizId);
      expect(result.title).toBe('Mathematics Quiz');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toBeInstanceOf(QuizQuestionDto);
      expect(result.questions[0].questionText).toBe('What is 2 + 2?');
      expect(result.questions[1].questionText).toBe('What is 3 * 3?');
    });

    it('should throw NotFoundException when quiz does not exist', async () => {
      // Arrange
      const quizId = 'nonexistent-quiz';
      mockNeo4jService.read.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getQuizById(quizId)).rejects.toThrow(
        NotFoundException,
      );
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (q:Quiz {id: $quizId})'),
        { quizId },
      );
    });

    it('should handle quiz with no questions', async () => {
      // Arrange
      const quizId = 'empty-quiz-id';
      const mockResult = [
        {
          id: 'empty-quiz-id',
          title: 'Empty Quiz',
          description: 'A quiz with no questions',
          timeLimit: 1800,
          createdAt: '2024-10-04T10:30:00Z',
          updatedAt: '2024-10-04T10:30:00Z',
          questions: [{ id: null, questionText: null, options: null, correctAnswer: null }],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockResult);

      // Act
      const result = await service.getQuizById(quizId);

      // Assert
      expect(result.questions).toEqual([]);
      expect(result.id).toBe('empty-quiz-id');
      expect(result.title).toBe('Empty Quiz');
    });

    it('should handle quiz with optional fields missing', async () => {
      // Arrange
      const quizId = 'minimal-quiz-id';
      const mockResult = [
        {
          id: 'minimal-quiz-id',
          title: 'Minimal Quiz',
          description: null,
          timeLimit: 1200,
          createdAt: null,
          updatedAt: null,
          questions: [
            {
              id: 'question-1',
              questionText: 'Simple question?',
              options: ['Yes', 'No'],
              correctAnswer: 'Yes',
              explanation: null,
              tags: null,
              createdAt: null,
              updatedAt: null,
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockResult);

      // Act
      const result = await service.getQuizById(quizId);

      // Assert
      expect(result.description).toBeUndefined();
      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeUndefined();
      expect(result.questions[0].explanation).toBeUndefined();
      expect(result.questions[0].tags).toBeUndefined();
    });
  });
});