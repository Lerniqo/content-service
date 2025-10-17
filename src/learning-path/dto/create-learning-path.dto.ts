/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLearningPathStepDto {
  @ApiProperty({
    description: 'Step number in the learning path',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  stepNumber: number;

  @ApiProperty({
    description: 'Title of the learning step',
    example: 'Python Basics',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the step',
    example: 'Learn the fundamental concepts of Python programming',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Estimated duration for this step',
    example: '1 week',
  })
  @IsString()
  @IsNotEmpty()
  estimatedDuration: string;

  @ApiProperty({
    description: 'List of resource IDs for this step',
    example: ['resource-001', 'resource-002'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  resources: string[];

  @ApiProperty({
    description: 'List of prerequisite step numbers',
    example: [],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  prerequisites: number[];
}

export class CreateLearningPathDto {
  @ApiProperty({
    description: 'Learning goal',
    example: 'Learn Python programming',
  })
  @IsString()
  @IsNotEmpty()
  learningGoal: string;

  @ApiProperty({
    description: 'Difficulty level',
    example: 'beginner',
  })
  @IsString()
  @IsNotEmpty()
  difficultyLevel: string;

  @ApiProperty({
    description: 'Total duration estimate',
    example: '4 weeks',
  })
  @IsString()
  @IsNotEmpty()
  totalDuration: string;

  @ApiProperty({
    description: 'List of learning steps',
    type: [CreateLearningPathStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLearningPathStepDto)
  steps: CreateLearningPathStepDto[];
}
