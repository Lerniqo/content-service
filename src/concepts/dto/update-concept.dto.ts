import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
import { ConceptType } from './create-concept.dto';

export class UpdateConceptDto {
  @ApiPropertyOptional({
    description: 'Name of the concept',
    example: 'Multiplication of Fractions (ATM001)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of the concept',
    example: 'Atom',
    enum: ConceptType,
  })
  @IsEnum(ConceptType)
  @IsOptional()
  type?: ConceptType;

  @ApiPropertyOptional({
    description: 'Description of the concept',
    example: 'Learn how to multiply fractions step by step',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of prerequisite concept IDs',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  prerequisiteIds?: string[];
}
