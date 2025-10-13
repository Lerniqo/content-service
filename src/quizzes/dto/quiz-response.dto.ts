import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizQuestionDto } from './quiz-question.dto';

export class QuizResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the quiz',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Title of the quiz',
    example: 'Basic Mathematics Quiz',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the quiz',
    example: 'A comprehensive quiz covering basic mathematical concepts',
  })
  description?: string;

  @ApiProperty({
    description: 'Time limit for the quiz in seconds',
    example: 3600,
  })
  timeLimit: number;

  @ApiProperty({
    description: 'Array of questions included in this quiz',
    type: [QuizQuestionDto],
  })
  questions: QuizQuestionDto[];

  @ApiPropertyOptional({
    description: 'Creation date of the quiz',
    example: '2024-10-04T10:30:00Z',
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Last update date of the quiz',
    example: '2024-10-04T10:30:00Z',
  })
  updatedAt?: string;

  constructor(
    id: string,
    title: string,
    timeLimit: number,
    questions: QuizQuestionDto[],
    description?: string,
    createdAt?: string,
    updatedAt?: string,
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.timeLimit = timeLimit;
    this.questions = questions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
