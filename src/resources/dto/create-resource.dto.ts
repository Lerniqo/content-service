import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsUrl,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  IsDate,
  IsIn,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RESOURCE_TYPES } from '../../libs/shared-types';
import type { ResourceType } from '../../libs/shared-types';

export class CreateResourceDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the resource (auto-generated if not provided)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID('4', { message: 'resourceId must be a valid UUID v4' })
  resourceId?: string;

  @ApiProperty({
    description: 'Name of the resource',
    example: 'Introduction to Fractions Video',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
  name: string;

  @ApiProperty({
    description: 'Type of the resource',
    enum: RESOURCE_TYPES,
    example: 'video',
  })
  @IsString({ message: 'Type must be a string' })
  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(RESOURCE_TYPES, {
    message: `Type must be one of: ${RESOURCE_TYPES.join(', ')}`,
  })
  type: ResourceType;

  @ApiPropertyOptional({
    description: 'Description of the resource',
    example: 'A comprehensive video explaining fraction operations',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'URL where the resource content is located',
    example: 'https://example.com/resources/fractions-intro',
  })
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsNotEmpty({ message: 'URL is required' })
  url: string;

  @ApiProperty({
    description: 'Whether the resource is publicly accessible',
    example: true,
  })
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic: boolean;

  @ApiPropertyOptional({
    description: 'Price of the resource (if not free)',
    example: 9.99,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be non-negative' })
  price?: number;

  @ApiPropertyOptional({
    description: 'Tags associated with the resource',
    example: ['mathematics', 'fractions', 'elementary'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Creation date of the resource',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDate({ message: 'createdAt must be a valid date' })
  @Type(() => Date)
  createdAt?: Date;

  @ApiProperty({
    description:
      'ID of the SyllabusConcept that this resource explains (conceptId in database)',
    example: 'concept-math-001',
  })
  @IsString({ message: 'Concept ID must be a string' })
  @IsNotEmpty({ message: 'Concept ID is required' })
  conceptId: string;

  @ApiPropertyOptional({
    description: 'Grade level for this resource',
    example: 'Grade 8',
  })
  @IsOptional()
  @IsString({ message: 'Grade level must be a string' })
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'Subject area for this resource',
    example: 'Mathematics',
  })
  @IsOptional()
  @IsString({ message: 'Subject must be a string' })
  subject?: string;
}
