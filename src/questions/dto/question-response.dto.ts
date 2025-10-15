import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionResponseDto {
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

  @ApiProperty({
    description: 'Creation date of the question',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update date of the question',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;

  constructor(partial: Partial<QuestionResponseDto>) {
    Object.assign(this, partial);
  }
}
