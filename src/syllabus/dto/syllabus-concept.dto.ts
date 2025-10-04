/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyllabusConceptDto {
  @ApiProperty({
    description: 'Unique identifier for the concept',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  conceptId: string;

  @ApiProperty({
    description: 'Name of the concept',
    example: 'Fractions (MOL001)',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the concept',
    example: 'Molecule',
    enum: ['Subject', 'Matter', 'Molecule', 'Atom', 'Particle', 'Grade', 'Topic'],
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Description of the concept',
    example: 'Operations and properties of fractions',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Child concepts contained within this concept',
    type: [SyllabusConceptDto],
  })
  children?: SyllabusConceptDto[];

  @ApiPropertyOptional({
    description: 'Creation date of the concept',
    example: '2024-10-04T10:30:00Z',
  })
  createdAt?: string;

  constructor(
    conceptId: string,
    name: string,
    type: string,
    description?: string,
    children?: SyllabusConceptDto[],
    createdAt?: string,
  ) {
    this.conceptId = conceptId;
    this.name = name;
    this.type = type;
    this.description = description;
    this.children = children;
    this.createdAt = createdAt;
  }
}