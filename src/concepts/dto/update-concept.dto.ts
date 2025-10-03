import { CONCEPT_TYPES } from '../../libs/shared-types';
import type { ConceptType } from '../../libs/shared-types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  Length,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class UpdateConceptDto {
  @ApiProperty({
    description: 'Name of the concept',
    example: 'Matter',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty if provided' })
  @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
  name?: string;

  @ApiProperty({
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'Matter',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Type must be a string' })
  @IsNotEmpty({ message: 'Type cannot be empty if provided' })
  @IsIn(CONCEPT_TYPES, {
    message: `Type must be one of: ${CONCEPT_TYPES.join(', ')}`,
  })
  type?: ConceptType;

  @ApiProperty({
    description: 'Optional description of the concept',
    example: 'Updated description of the concept',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @ApiProperty({
    description:
      'Optional parent concept ID to create/update a CONTAINS relationship. Set to null or empty string to remove parent relationship.',
    example: 'parent-concept-123',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o, value) => value !== null && value !== '')
  @IsString({ message: 'Parent ID must be a string' })
  @IsNotEmpty({ message: 'Parent ID cannot be empty if provided' })
  @Length(1, 255, { message: 'Parent ID must be between 1 and 255 characters' })
  parentId?: string | null;
}
