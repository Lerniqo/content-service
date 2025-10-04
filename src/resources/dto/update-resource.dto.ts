/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Length,
} from 'class-validator';
import { RESOURCE_TYPES } from '../../libs/shared-types';
import type { ResourceType } from '../../libs/shared-types';

export class UpdateResourceDto {
  @ApiPropertyOptional({
    description: 'Name of the resource',
    example: 'Advanced Fractions Video - Updated',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of the resource',
    enum: RESOURCE_TYPES,
    example: 'video',
  })
  @IsOptional()
  @IsString({ message: 'Type must be a string' })
  @IsIn(RESOURCE_TYPES, {
    message: `Type must be one of: ${RESOURCE_TYPES.join(', ')}`,
  })
  type?: ResourceType;

  @ApiPropertyOptional({
    description: 'Description of the resource',
    example: 'An updated comprehensive video explaining fraction operations',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL where the resource content is located',
    example: 'https://example.com/resources/fractions-advanced',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL must be a valid URL' })
  url?: string;

  @ApiPropertyOptional({
    description: 'Whether the resource is publicly accessible',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Price of the resource (if not free)',
    example: 14.99,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be non-negative' })
  price?: number;

  @ApiPropertyOptional({
    description: 'Tags associated with the resource',
    example: ['mathematics', 'fractions', 'advanced', 'high-school'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Grade level for this resource',
    example: 'Grade 9',
  })
  @IsOptional()
  @IsString({ message: 'Grade level must be a string' })
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'Subject area for this resource',
    example: 'Advanced Mathematics',
  })
  @IsOptional()
  @IsString({ message: 'Subject must be a string' })
  subject?: string;
}