/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  ArrayMaxSize,
  ArrayMinSize,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';

export class UpdateContestDto {
  @ApiPropertyOptional({
    description: 'Name of the contest',
    example: 'Mathematics Championship 2025',
  })
  @IsOptional()
  @IsString({ message: 'Contest name must be a string' })
  @Length(2, 255, { message: 'Contest name must be between 2 and 255 characters' })
  contestName?: string;

  @ApiPropertyOptional({
    description: 'Subtitle of the contest',
    example: 'Test your mathematics skills and compete with peers',
  })
  @IsOptional()
  @IsString({ message: 'Subtitle must be a string' })
  @Length(0, 500, { message: 'Subtitle must be less than 500 characters' })
  subTitle?: string;

  @ApiPropertyOptional({
    description: 'Start date of the contest in ISO 8601 format',
    example: '2025-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date of the contest in ISO 8601 format',
    example: '2025-11-30T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Array of tasks for the contest (maximum 5 tasks)',
    type: [CreateTaskDto],
  })
  @IsOptional()
  @IsArray({ message: 'Tasks must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDto)
  @ArrayMinSize(1, { message: 'At least 1 task is required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 tasks are allowed' })
  tasks?: CreateTaskDto[];
}
