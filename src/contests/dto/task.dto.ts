/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class TaskDto {
  @ApiProperty({
    description: 'Unique identifier of the task',
    example: 'task-12345',
  })
  taskId: string;

  @ApiProperty({
    description: 'Title of the task',
    example: 'Complete 5 One-on-One Battles',
  })
  title: string;

  @ApiProperty({
    description: 'Type of the task',
    example: '1Vs1_tasks',
  })
  type: string;

  @ApiProperty({
    description: 'Description of the task',
    example: 'Win 5 one-on-one battles to complete this task',
  })
  description: string;

  @ApiProperty({
    description: 'Goal - number of times the task needs to be completed',
    example: 5,
  })
  goal: number;
}
