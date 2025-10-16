/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskDto } from './task.dto';

export class ContestResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the contest',
    example: 'contest-12345',
  })
  contestId: string;

  @ApiProperty({
    description: 'Name of the contest',
    example: 'Mathematics Championship 2025',
  })
  contestName: string;

  @ApiPropertyOptional({
    description: 'Subtitle of the contest',
    example: 'Test your mathematics skills and compete with peers',
  })
  subTitle?: string;

  @ApiProperty({
    description: 'Start date of the contest',
    example: '2025-11-01T00:00:00Z',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date of the contest',
    example: '2025-11-30T23:59:59Z',
  })
  endDate: string;

  @ApiProperty({
    description: 'Tasks in the contest',
    type: [TaskDto],
  })
  tasks: TaskDto[];

  @ApiPropertyOptional({
    description: 'Creation timestamp',
    example: '2025-10-01T10:00:00Z',
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Last update timestamp',
    example: '2025-10-15T14:30:00Z',
  })
  updatedAt?: string;
}
