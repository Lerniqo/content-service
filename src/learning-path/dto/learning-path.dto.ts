/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LearningPathStepDto {
  @ApiProperty({
    description: 'Step number in the learning path',
    example: 1,
  })
  stepNumber: number;

  @ApiProperty({
    description: 'Title of the learning step',
    example: 'Python Basics',
  })
  title: string;

  @ApiProperty({
    description: 'Description of the step',
    example: 'Learn the fundamental concepts of Python programming',
  })
  description: string;

  @ApiProperty({
    description: 'Estimated duration for this step',
    example: '1 week',
  })
  estimatedDuration: string;

  @ApiProperty({
    description: 'List of resource IDs for this step',
    example: ['resource-001', 'resource-002'],
    type: [String],
  })
  resources: string[];

  @ApiProperty({
    description: 'List of prerequisite step numbers',
    example: [],
    type: [Number],
  })
  prerequisites: number[];
}

export class LearningPathDetailsDto {
  @ApiProperty({
    description: 'Learning goal',
    example: 'Learn Python programming',
  })
  goal: string;

  @ApiProperty({
    description: 'Difficulty level',
    example: 'beginner',
  })
  difficultyLevel: string;

  @ApiProperty({
    description: 'Total duration estimate',
    example: '4 weeks',
  })
  totalDuration: string;

  @ApiProperty({
    description: 'List of learning steps',
    type: [LearningPathStepDto],
  })
  steps: LearningPathStepDto[];
}

export class GetLearningPathResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the learning path',
    example: 'lp_abc123def',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this learning path',
    example: 'user_789',
  })
  userId: string;

  @ApiProperty({
    description: 'Learning goal',
    example: 'Learn Python programming',
  })
  learningGoal: string;

  @ApiProperty({
    description: 'Learning path details',
    type: LearningPathDetailsDto,
  })
  learningPath: LearningPathDetailsDto;

  @ApiPropertyOptional({
    description: 'Mastery scores used for generating the path',
  })
  masteryScores?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}
