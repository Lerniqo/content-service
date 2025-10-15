import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SyllabusConceptType } from './create-syllabus-concept.dto';

export class UpdateSyllabusConceptDto {
  @ApiPropertyOptional({
    description: 'Name of the syllabus concept',
    example: 'Ordinary Level Mathematics (OLM001)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of the syllabus concept',
    example: 'Subject',
    enum: SyllabusConceptType,
  })
  @IsEnum(SyllabusConceptType)
  @IsOptional()
  type?: SyllabusConceptType;

  @ApiPropertyOptional({
    description: 'Description of the syllabus concept',
    example: 'Core mathematics curriculum for ordinary level',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent concept ID to nest this concept under',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}
