/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDateString,
  ArrayMaxSize,
  ArrayMinSize,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';

export class CreateContestDto {
  @ApiProperty({
    description: 'Name of the contest',
    example: 'Mathematics Championship 2025',
  })
  @IsString({ message: 'Contest name must be a string' })
  @IsNotEmpty({ message: 'Contest name is required' })
  @Length(2, 255, { message: 'Contest name must be between 2 and 255 characters' })
  contestName: string;

  @ApiPropertyOptional({
    description: 'Subtitle of the contest',
    example: 'Test your mathematics skills and compete with peers',
  })
  @IsOptional()
  @IsString({ message: 'Subtitle must be a string' })
  @Length(0, 500, { message: 'Subtitle must be less than 500 characters' })
  subTitle?: string;

  @ApiProperty({
    description: 'Start date of the contest in ISO 8601 format',
    example: '2025-11-01T00:00:00Z',
  })
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @ApiProperty({
    description: 'End date of the contest in ISO 8601 format',
    example: '2025-11-30T23:59:59Z',
  })
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'End date is required' })
  endDate: string;

  @ApiProperty({
    description: 'Array of tasks for the contest (maximum 5 tasks)',
    type: [CreateTaskDto],
    example: [
      {
        title: 'Complete 5 One-on-One Battles',
        type: '1Vs1_tasks',
        description: 'Win 5 one-on-one battles to complete this task',
        goal: 5,
      },
    ],
  })
  @IsArray({ message: 'Tasks must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDto)
  @ArrayMinSize(1, { message: 'At least 1 task is required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 tasks are allowed' })
  tasks: CreateTaskDto[];
}
