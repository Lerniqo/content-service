import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException } from '@nestjs/common';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { QuizQuestionDto } from './dto/quiz-question.dto';

describe('QuizzesController - getQuizById', () => {
  let controller: QuizzesController;
  let service: QuizzesService;

  const mockQuizzesService = {
    getQuizById: jest.fn(),
    createQuiz: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      role: ['student'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [
        {
          provide: QuizzesService,
          useValue: mockQuizzesService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<QuizzesController>(QuizzesController);
    service = module.get<QuizzesService>(QuizzesService);
  });

  describe('getQuizById', () => {
    it('should return a quiz with questions', async () => {
      // Arrange
      const quizId = 'test-quiz-id';
      const questions = [
        new QuizQuestionDto(
          'question-1',
          'What is 2 + 2?',
          ['2', '3', '4', '5'],
          '4',
          'Adding 2 + 2 equals 4',
          ['math', 'addition'],
          '2024-10-04T10:30:00Z',
          '2024-10-04T10:30:00Z',
        ),
      ];
      const expectedResult = new QuizResponseDto(
        quizId,
        'Mathematics Quiz',
        3600,
        questions,
        'Basic math quiz',
        '2024-10-04T10:30:00Z',
        '2024-10-04T10:30:00Z',
      );

      mockQuizzesService.getQuizById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getQuizById(quizId, mockRequest as any);

      // Assert
      expect(service.getQuizById).toHaveBeenCalledWith(quizId);
      expect(result).toEqual(expectedResult);
      expect(result.id).toBe(quizId);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].questionText).toBe('What is 2 + 2?');
    });

    it('should handle quiz not found', async () => {
      // Arrange
      const quizId = 'nonexistent-id';
      mockQuizzesService.getQuizById.mockRejectedValue(
        new NotFoundException(`Quiz with ID ${quizId} not found`),
      );

      // Act & Assert
      await expect(
        controller.getQuizById(quizId, mockRequest as any),
      ).rejects.toThrow(NotFoundException);
      expect(service.getQuizById).toHaveBeenCalledWith(quizId);
    });

    it('should return quiz with empty questions array', async () => {
      // Arrange
      const quizId = 'empty-quiz-id';
      const expectedResult = new QuizResponseDto(
        quizId,
        'Empty Quiz',
        1800,
        [], // No questions
        'A quiz with no questions',
        '2024-10-04T10:30:00Z',
        '2024-10-04T10:30:00Z',
      );

      mockQuizzesService.getQuizById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getQuizById(quizId, mockRequest as any);

      // Assert
      expect(result.questions).toEqual([]);
      expect(result.id).toBe(quizId);
      expect(result.title).toBe('Empty Quiz');
    });
  });
});
