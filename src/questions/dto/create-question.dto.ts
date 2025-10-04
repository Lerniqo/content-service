/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDate,
  IsUUID,
  ArrayMinSize,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the question (auto-generated if not provided)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID must be a valid UUID' })
  id?: string;

  @ApiProperty({
    description: 'The question text',
    example: 'What is 2 + 2?',
  })
  @IsString({ message: 'Question text must be a string' })
  @IsNotEmpty({ message: 'Question text is required' })
  @Length(5, 1000, { message: 'Question text must be between 5 and 1000 characters' })
  questionText: string;

  @ApiProperty({
    description: 'Array of answer options',
    example: ['2', '3', '4', '5'],
    type: [String],
  })
  @IsArray({ message: 'Options must be an array' })
  @IsString({ each: true, message: 'Each option must be a string' })
  @ArrayMinSize(2, { message: 'At least 2 options are required' })
  options: string[];

  @ApiProperty({
    description: 'The correct answer from the options',
    example: '4',
  })
  @IsString({ message: 'Correct answer must be a string' })
  @IsNotEmpty({ message: 'Correct answer is required' })
  correctAnswer: string;

  @ApiPropertyOptional({
    description: 'Explanation for the correct answer',
    example: 'Adding 2 + 2 equals 4',
  })
  @IsOptional()
  @IsString({ message: 'Explanation must be a string' })
  @Length(0, 500, { message: 'Explanation must be less than 500 characters' })
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the question',
    example: ['mathematics', 'addition', 'elementary'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Creation date of the question',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDate({ message: 'createdAt must be a valid date' })
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Last update date of the question',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDate({ message: 'updatedAt must be a valid date' })
  @Type(() => Date)
  updatedAt?: Date;
}