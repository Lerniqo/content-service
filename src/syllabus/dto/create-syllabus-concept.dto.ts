import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum SyllabusConceptType {
  SUBJECT = 'Subject',
  MATTER = 'Matter',
  MOLECULE = 'Molecule',
  ATOM = 'Atom',
  PARTICLE = 'Particle',
  GRADE = 'Grade',
  TOPIC = 'Topic',
}

export class CreateSyllabusConceptDto {
  @ApiProperty({
    description: 'Name of the syllabus concept',
    example: 'Ordinary Level Mathematics (OLM001)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the syllabus concept',
    example: 'Subject',
    enum: SyllabusConceptType,
  })
  @IsEnum(SyllabusConceptType)
  @IsNotEmpty()
  type: SyllabusConceptType;

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
