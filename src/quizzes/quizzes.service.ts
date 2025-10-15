/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizResponseDto } from './dto/create-quiz-response.dto';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { QuizQuestionDto } from './dto/quiz-question.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

interface QuestionData {
  id: string | null;
  questionText: string | null;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  tags: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface QuizQueryResult {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  createdAt: string | null;
  updatedAt: string | null;
  questions: QuestionData[];
}

@Injectable()
export class QuizzesService {

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuizzesService.name);
  }


  async getQuizzesByConceptId(conceptId: string): Promise<QuizResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'QuizzesService',
      'Fetching quizzes by concept ID',
      { conceptId },
    );

    const cypher = `
      MATCH (quiz:Quiz)-[:TESTS]->(concept:SyllabusConcept {conceptId: $conceptId})
      
      // Get all questions included in each quiz
      OPTIONAL MATCH (quiz)-[:INCLUDES]->(question:Question)
      
      RETURN 
        quiz.id as id,
        quiz.title as title,
        quiz.description as description,
        quiz.timeLimit as timeLimit,
        quiz.createdAt as createdAt,
        quiz.updatedAt as updatedAt,
        
        // Collect questions for each quiz
        COLLECT(DISTINCT {
          id: question.id,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          tags: question.tags,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt
        }) as questions
    `;

    try {
      const rawResult = await this.neo4jService.read(cypher, { conceptId }) as unknown;
      const result = rawResult as QuizQueryResult[];

      if (!result || result.length === 0) {
        LoggerUtil.logInfo(
          this.logger,
          'QuizzesService',
          'No quizzes found for concept',
          { conceptId },
        );
        return [];
      }

      const quizzes = result.map((quizData) => {
        // Filter out null questions (when no questions exist)
        const questions = quizData.questions
          .filter((question: QuestionData) => question.id !== null)
          .map(
            (question: QuestionData) =>
              new QuizQuestionDto(
                question.id!,
                question.questionText!,
                question.options!,
                question.correctAnswer!,
                question.explanation ?? undefined,
                question.tags ?? undefined,
                question.createdAt ?? undefined,
                question.updatedAt ?? undefined,
              ),
          );

        return new QuizResponseDto(
          quizData.id,
          quizData.title,
          quizData.timeLimit,
          questions,
          quizData.description ?? undefined,
          quizData.createdAt ?? undefined,
          quizData.updatedAt ?? undefined,
        );
      });

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesService',
        'Quizzes retrieved successfully for concept',
        {
          conceptId,
          quizzesCount: quizzes.length,
        },
      );

      return quizzes;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Failed to retrieve quizzes by concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  async createQuiz(createQuizDto: CreateQuizDto, userId: string): Promise<CreateQuizResponseDto> {
    const quizId = uuidv4();
    
    LoggerUtil.logInfo(
      this.logger,
      'QuizzesService',
      'Creating new quiz',
      {
        quizId,
        title: createQuizDto.title,
        conceptId: createQuizDto.conceptId,
        questionCount: createQuizDto.questionIds.length,
        timeLimit: createQuizDto.timeLimit,
        userId,
      },
    );

    try {
      // Verify that the concept exists
      await this.verifyConceptExists(createQuizDto.conceptId);

      // Verify that all questions exist
      await this.verifyQuestionsExist(createQuizDto.questionIds);

      // Create the Quiz node
      const createdAt = new Date().toISOString();
      await this.createQuizNode(quizId, createQuizDto, createdAt);

      // Create [:INCLUDES] relationships from Quiz to Questions
      await this.createIncludesRelationships(quizId, createQuizDto.questionIds);

      // Create [:TESTS] relationship from Quiz to Concept
      await this.createTestsRelationship(quizId, createQuizDto.conceptId);

      // Create [:CREATED] relationship between User and Quiz
      await this.createCreatedRelationship(userId, quizId);

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesService',
        'Quiz created successfully',
        { quizId, userId },
      );

      return new CreateQuizResponseDto(
        quizId,
        createQuizDto.title,
        createQuizDto.timeLimit,
        createQuizDto.conceptId,
        createQuizDto.questionIds,
        createdAt,
        createQuizDto.description,
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Failed to create quiz',
        error,
        { quizId, userId, conceptId: createQuizDto.conceptId },
      );
      
      // Cleanup: attempt to remove any partially created data
      await this.cleanupPartialQuiz(quizId);
      
      throw error;
    }
  }

  async getQuizById(quizId: string): Promise<QuizResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'QuizzesService',
      'Fetching quiz by ID with questions',
      { quizId },
    );

    const cypher = `
      MATCH (q:Quiz {id: $quizId})
      
      // Get all questions included in this quiz
      OPTIONAL MATCH (q)-[:INCLUDES]->(question:Question)
      
      RETURN 
        q.id as id,
        q.title as title,
        q.description as description,
        q.timeLimit as timeLimit,
        q.createdAt as createdAt,
        q.updatedAt as updatedAt,
        
        // Collect questions
        COLLECT(DISTINCT {
          id: question.id,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          tags: question.tags,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt
        }) as questions
    `;

    try {
      const rawResult = await this.neo4jService.read(cypher, { quizId }) as unknown;
      const result = rawResult as QuizQueryResult[];

      if (!result || result.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'QuizzesService',
          'Quiz not found',
          { quizId },
        );
        throw new NotFoundException(`Quiz with ID ${quizId} not found`);
      }

      const quizData = result[0];

      // Filter out null questions (when no questions exist)
      const questions = quizData.questions
        .filter((question: QuestionData) => question.id !== null)
        .map(
          (question: QuestionData) =>
            new QuizQuestionDto(
              question.id!,
              question.questionText!,
              question.options!,
              question.correctAnswer!,
              question.explanation ?? undefined,
              question.tags ?? undefined,
              question.createdAt ?? undefined,
              question.updatedAt ?? undefined,
            ),
        );

      const response = new QuizResponseDto(
        quizData.id,
        quizData.title,
        quizData.timeLimit,
        questions,
        quizData.description ?? undefined,
        quizData.createdAt ?? undefined,
        quizData.updatedAt ?? undefined,
      );

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesService',
        'Quiz retrieved successfully',
        {
          quizId,
          questionsCount: questions.length,
          title: response.title,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Failed to retrieve quiz',
        error,
        { quizId },
      );
      throw error;
    }
  }

  private async verifyConceptExists(conceptId: string): Promise<void> {
    const query = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      RETURN c.conceptId as conceptId
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        conceptId,
      })) as any[];
      
      if (result.length === 0) {
        throw new NotFoundException(`Concept with ID ${conceptId} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error verifying concept existence',
        error,
        { conceptId },
      );
      
      throw new InternalServerErrorException(
        'Failed to verify concept existence',
      );
    }
  }

  private async verifyQuestionsExist(questionIds: string[]): Promise<void> {
    LoggerUtil.logDebug(
      this.logger,
      'QuizzesService',
      'Verifying questions exist',
      { questionIds, questionCount: questionIds.length },
    );

    const query = `
      MATCH (q:Question)
      WHERE q.id IN $questionIds
      RETURN q.id as id
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        questionIds,
      })) as any[];
      
      const foundQuestionIds = result.map((r: Record<string, any>) => r.id as string);
      const missingQuestionIds = questionIds.filter(id => !foundQuestionIds.includes(id));

      LoggerUtil.logDebug(
        this.logger,
        'QuizzesService',
        'Question verification results',
        { 
          requestedQuestions: questionIds,
          foundQuestions: foundQuestionIds,
          missingQuestions: missingQuestionIds,
          foundCount: foundQuestionIds.length,
          expectedCount: questionIds.length
        },
      );

      if (missingQuestionIds.length > 0) {
        throw new BadRequestException(
          `Questions not found: ${missingQuestionIds.join(', ')}`
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error verifying questions existence',
        error,
        { questionIds },
      );
      
      throw new InternalServerErrorException(
        'Failed to verify questions existence',
      );
    }
  }

  private async createQuizNode(
    quizId: string,
    createQuizDto: CreateQuizDto,
    createdAt: string,
  ): Promise<void> {
    const query = `
      CREATE (q:Quiz {
        id: $id,
        title: $title,
        description: $description,
        timeLimit: $timeLimit,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      RETURN q.id as id
    `;

    const params = {
      id: quizId,
      title: createQuizDto.title,
      description: createQuizDto.description || null,
      timeLimit: createQuizDto.timeLimit,
      createdAt: createdAt,
      updatedAt: createdAt,
    };

    try {
      const result = (await this.neo4jService.write(query, params)) as any[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create quiz node',
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'QuizzesService',
        'Quiz node created successfully',
        { quizId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error creating quiz node',
        error,
        { quizId, params },
      );
      
      throw new InternalServerErrorException('Failed to create quiz node');
    }
  }

  private async createIncludesRelationships(quizId: string, questionIds: string[]): Promise<void> {
    // First verify the quiz exists
    const verifyQuizQuery = `
      MATCH (quiz:Quiz {id: $quizId})
      RETURN quiz.id as id
    `;

    try {
      const quizExists = (await this.neo4jService.read(verifyQuizQuery, { quizId })) as any[];
      if (quizExists.length === 0) {
        throw new InternalServerErrorException('Quiz not found for relationship creation');
      }

      // Create relationships one by one to better handle errors
      let successCount = 0;
      
      for (const questionId of questionIds) {
        const relationshipQuery = `
          MATCH (quiz:Quiz {id: $quizId})
          MATCH (question:Question {id: $questionId})
          MERGE (quiz)-[:INCLUDES]->(question)
          RETURN question.id as questionId
        `;

        try {
          const result = (await this.neo4jService.write(relationshipQuery, {
            quizId,
            questionId,
          })) as any[];

          if (result.length > 0) {
            successCount++;
          } else {
            LoggerUtil.logError(
              this.logger,
              'QuizzesService',
              `Failed to create INCLUDES relationship for question ${questionId}`,
              new Error('No result returned'),
              { quizId, questionId },
            );
          }
        } catch (relationshipError) {
          LoggerUtil.logError(
            this.logger,
            'QuizzesService',
            `Error creating INCLUDES relationship for question ${questionId}`,
            relationshipError,
            { quizId, questionId },
          );
          throw relationshipError;
        }
      }
      
      if (successCount !== questionIds.length) {
        throw new InternalServerErrorException(
          `Failed to create all INCLUDES relationships. Created ${successCount} out of ${questionIds.length}`,
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'QuizzesService',
        'INCLUDES relationships created successfully',
        { quizId, questionIds, successCount },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error creating INCLUDES relationships',
        error,
        { quizId, questionIds },
      );
      
      throw new InternalServerErrorException(
        'Failed to create INCLUDES relationships',
      );
    }
  }

  private async createTestsRelationship(quizId: string, conceptId: string): Promise<void> {
    const query = `
      MATCH (quiz:Quiz {id: $quizId})
      MATCH (concept:SyllabusConcept {conceptId: $conceptId})
      CREATE (quiz)-[:TESTS]->(concept)
      RETURN concept.conceptId as conceptId
    `;

    try {
      const result = (await this.neo4jService.write(query, {
        quizId,
        conceptId,
      })) as any[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create TESTS relationship',
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'QuizzesService',
        'TESTS relationship created successfully',
        { quizId, conceptId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error creating TESTS relationship',
        error,
        { quizId, conceptId },
      );
      
      throw new InternalServerErrorException(
        'Failed to create TESTS relationship',
      );
    }
  }

  private async createCreatedRelationship(userId: string, quizId: string): Promise<void> {
    // First ensure the user node exists
    await this.ensureUserNodeExists(userId);

    const query = `
      MATCH (u:User {userId: $userId})
      MATCH (q:Quiz {id: $quizId})
      CREATE (u)-[:CREATED]->(q)
      RETURN q.id as quizId
    `;

    try {
      const result = (await this.neo4jService.write(query, {
        userId,
        quizId,
      })) as any[];

      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create CREATED relationship',
        );
      }

      LoggerUtil.logDebug(
        this.logger,
        'QuizzesService',
        'CREATED relationship created successfully',
        { userId, quizId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error creating CREATED relationship',
        error,
        { userId, quizId },
      );

      throw new InternalServerErrorException(
        'Failed to create CREATED relationship',
      );
    }
  }

  private async ensureUserNodeExists(userId: string): Promise<void> {
    const query = `
      MERGE (u:User {userId: $userId})
      RETURN u.userId as userId
    `;

    try {
      await this.neo4jService.write(query, { userId });
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Error ensuring user node exists',
        error,
        { userId },
      );
      // Don't throw here as this is not critical for the creation operation
    }
  }

  private async cleanupPartialQuiz(quizId: string): Promise<void> {
    const query = `
      MATCH (q:Quiz {id: $quizId})
      DETACH DELETE q
    `;

    try {
      await this.neo4jService.write(query, { quizId });
      
      LoggerUtil.logInfo(
        this.logger,
        'QuizzesService',
        'Cleaned up partial quiz and all relationships',
        { quizId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesService',
        'Failed to cleanup partial quiz',
        error,
        { quizId },
      );
    }
  }
}