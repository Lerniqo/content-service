/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  Length,
} from 'class-validator';

export enum LearningLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class RequestLearningPathDto {
  @ApiProperty({
    description: 'The learning goal or objective',
    example: 'Learn Python programming',
  })
  @IsString({ message: 'Learning goal must be a string' })
  @IsNotEmpty({ message: 'Learning goal is required' })
  @Length(5, 500, {
    message: 'Learning goal must be between 5 and 500 characters',
  })
  learningGoal: string;

  @ApiProperty({
    description: 'Current knowledge level',
    enum: LearningLevel,
    example: LearningLevel.BEGINNER,
  })
  @IsEnum(LearningLevel, { message: 'Invalid learning level' })
  @IsNotEmpty({ message: 'Current level is required' })
  currentLevel: LearningLevel;

  @ApiPropertyOptional({
    description: 'Learning preferences',
    example: {
      format: 'video',
      topics: ['basics', 'data structures'],
    },
  })
  @IsOptional()
  @IsObject({ message: 'Preferences must be an object' })
  preferences?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Available time for learning',
    example: '2 hours/day',
  })
  @IsOptional()
  @IsString({ message: 'Available time must be a string' })
  availableTime?: string;
}
