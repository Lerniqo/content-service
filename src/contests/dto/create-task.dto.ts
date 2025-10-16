/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  Length,
} from 'class-validator';

export enum TaskType {
  ONE_VS_ONE = '1Vs1_tasks',
  AI_QUESTIONS = 'AI_Questions_tasks',
}

export class CreateTaskDto {
  @ApiProperty({
    description: 'Title of the task',
    example: 'Complete 5 One-on-One Battles',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(2, 255, { message: 'Title must be between 2 and 255 characters' })
  title: string;

  @ApiProperty({
    description: 'Type of the task',
    enum: TaskType,
    example: TaskType.ONE_VS_ONE,
  })
  @IsEnum(TaskType, { message: 'Type must be either 1Vs1_tasks or AI_Questions_tasks' })
  @IsNotEmpty({ message: 'Type is required' })
  type: TaskType;

  @ApiProperty({
    description: 'Description of the task',
    example: 'Win 5 one-on-one battles to complete this task',
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @Length(2, 1000, { message: 'Description must be between 2 and 1000 characters' })
  description: string;

  @ApiProperty({
    description: 'Goal - number of times the task needs to be completed',
    example: 5,
  })
  @IsNumber({}, { message: 'Goal must be a number' })
  @Min(1, { message: 'Goal must be at least 1' })
  goal: number;
}
