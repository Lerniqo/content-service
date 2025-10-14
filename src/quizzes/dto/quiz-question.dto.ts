import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizQuestionDto {
  @ApiProperty({
    description: 'Unique identifier for the question',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'The question text',
    example: 'What is 2 + 2?',
  })
  questionText: string;

  @ApiProperty({
    description: 'Array of answer options',
    example: ['2', '3', '4', '5'],
    type: [String],
  })
  options: string[];

  @ApiProperty({
    description: 'The correct answer from the options',
    example: '4',
  })
  correctAnswer: string;

  @ApiPropertyOptional({
    description: 'Explanation for the correct answer',
    example: 'Adding 2 + 2 equals 4',
  })
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the question',
    example: ['mathematics', 'addition', 'elementary'],
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Creation date of the question',
    example: '2024-10-04T10:30:00Z',
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Last update date of the question',
    example: '2024-10-04T10:30:00Z',
  })
  updatedAt?: string;

  constructor(
    id: string,
    questionText: string,
    options: string[],
    correctAnswer: string,
    explanation?: string,
    tags?: string[],
    createdAt?: string,
    updatedAt?: string,
  ) {
    this.id = id;
    this.questionText = questionText;
    this.options = options;
    this.correctAnswer = correctAnswer;
    this.explanation = explanation;
    this.tags = tags;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
