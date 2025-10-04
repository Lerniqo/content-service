/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created quiz',
    example: 'quiz-001',
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
    description: 'ID of the concept that this quiz tests',
    example: 'concept-math-001',
  })
  conceptId: string;

  @ApiProperty({
    description: 'Array of question IDs included in this quiz',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d481'],
    type: [String],
  })
  questionIds: string[];

  @ApiProperty({
    description: 'Creation date of the quiz',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  constructor(
    id: string,
    title: string,
    timeLimit: number,
    conceptId: string,
    questionIds: string[],
    createdAt: string,
    description?: string,
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.timeLimit = timeLimit;
    this.conceptId = conceptId;
    this.questionIds = questionIds;
    this.createdAt = createdAt;
  }
}