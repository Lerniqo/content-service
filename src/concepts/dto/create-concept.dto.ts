import { SyllabusConcept, CONCEPT_TYPES } from '../../libs/shared-types';
import type { ConceptType } from '../../libs/shared-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  Length,
  IsOptional,
} from 'class-validator';

export class CreateConceptDto implements Omit<SyllabusConcept, 'createdAt'> {
  @ApiProperty({
    description: 'Unique identifier for the concept (conceptId in database)',
    example: 'concept-123',
  })
  @IsString({ message: 'Concept ID must be a string' })
  @IsNotEmpty({ message: 'Concept ID is required' })
  @Length(1, 100, {
    message: 'Concept ID must be between 1 and 100 characters',
  })
  conceptId: string;

  @ApiProperty({
    description: 'Name of the concept',
    example: 'Matter',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
  name: string;

  @ApiProperty({
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'Matter',
  })
  @IsString({ message: 'Type must be a string' })
  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(CONCEPT_TYPES, {
    message: `Type must be one of: ${CONCEPT_TYPES.join(', ')}`,
  })
  type: ConceptType;

  @ApiProperty({
    description: 'Optional description of the concept',
    example: 'Fundamental concepts of numbers',
    required: false,
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Optional parent concept ID to create a CONTAINS relationship',
    example: 'parent-concept-123',
    required: false,
  })
  @IsString({ message: 'Parent ID must be a string' })
  @IsOptional()
  parentId?: string;
}
