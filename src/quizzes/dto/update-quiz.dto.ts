/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  ArrayMinSize,
  Length,
} from 'class-validator';

export class UpdateQuizDto {
  @ApiPropertyOptional({
    description: 'Title of the quiz',
    example: 'Advanced Mathematics Quiz',
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @Length(2, 255, { message: 'Title must be between 2 and 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the quiz',
    example: 'An updated comprehensive quiz covering advanced mathematical concepts',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Time limit for the quiz in seconds',
    example: 4500,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Time limit must be a number' })
  @Min(60, { message: 'Time limit must be at least 60 seconds' })
  timeLimit?: number;

  @ApiPropertyOptional({
    description: 'ID of the concept that this quiz tests',
    example: 'concept-math-002',
  })
  @IsOptional()
  @IsString({ message: 'Concept ID must be a string' })
  conceptId?: string;

  @ApiPropertyOptional({
    description: 'Array of question IDs to include in this quiz',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d480'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Question IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each question ID must be a valid UUID' })
  @ArrayMinSize(1, { message: 'At least 1 question is required' })
  questionIds?: string[];
}
