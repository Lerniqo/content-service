/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  ArrayMinSize,
  Length,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({
    description: 'Title of the quiz',
    example: 'Basic Mathematics Quiz',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(2, 255, { message: 'Title must be between 2 and 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the quiz',
    example: 'A comprehensive quiz covering basic mathematical concepts',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Time limit for the quiz in seconds',
    example: 3600,
  })
  @IsNumber({}, { message: 'Time limit must be a number' })
  @Min(60, { message: 'Time limit must be at least 60 seconds' })
  timeLimit: number;

  @ApiProperty({
    description: 'ID of the concept that this quiz tests',
    example: 'concept-math-001',
  })
  @IsString({ message: 'Concept ID must be a string' })
  @IsNotEmpty({ message: 'Concept ID is required' })
  conceptId: string;

  @ApiProperty({
    description: 'Array of question IDs to include in this quiz',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d481'],
    type: [String],
  })
  @IsArray({ message: 'Question IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each question ID must be a valid UUID' })
  @ArrayMinSize(1, { message: 'At least 1 question is required' })
  questionIds: string[];
}