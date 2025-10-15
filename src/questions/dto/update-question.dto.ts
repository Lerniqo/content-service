/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  Length,
} from 'class-validator';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    description: 'The question text',
    example: 'What is 2 + 2?',
  })
  @IsOptional()
  @IsString({ message: 'Question text must be a string' })
  @Length(5, 1000, { message: 'Question text must be between 5 and 1000 characters' })
  questionText?: string;

  @ApiPropertyOptional({
    description: 'Array of answer options',
    example: ['2', '3', '4', '5'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Options must be an array' })
  @IsString({ each: true, message: 'Each option must be a string' })
  @ArrayMinSize(2, { message: 'At least 2 options are required' })
  options?: string[];

  @ApiPropertyOptional({
    description: 'The correct answer from the options',
    example: '4',
  })
  @IsOptional()
  @IsString({ message: 'Correct answer must be a string' })
  correctAnswer?: string;

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
}
