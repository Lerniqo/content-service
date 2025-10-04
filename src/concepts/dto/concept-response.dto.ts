import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConceptPrerequisiteDto } from './concept-prerequisite.dto';
import { LearningResourceDto } from './learning-resource.dto';

export class ConceptResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the concept',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  conceptId: string;

  @ApiProperty({
    description: 'Name of the concept',
    example: 'Multiplication of Fractions (ATM001)',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the concept',
    example: 'Atom',
    enum: ['Subject', 'Matter', 'Molecule', 'Atom', 'Particle'],
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Description of the concept',
    example: 'Learn how to multiply fractions step by step',
  })
  description?: string;

  @ApiProperty({
    description:
      'Array of prerequisite concepts required before learning this concept',
    type: [ConceptPrerequisiteDto],
  })
  prerequisites: ConceptPrerequisiteDto[];

  @ApiProperty({
    description: 'Array of learning resources associated with this concept',
    type: [LearningResourceDto],
  })
  learningResources: LearningResourceDto[];

  @ApiPropertyOptional({
    description: 'Creation date of the concept',
    example: '2024-10-04T10:30:00Z',
  })
  createdAt?: string;

  constructor(
    conceptId: string,
    name: string,
    type: string,
    prerequisites: ConceptPrerequisiteDto[],
    learningResources: LearningResourceDto[],
    description?: string,
    createdAt?: string,
  ) {
    this.conceptId = conceptId;
    this.name = name;
    this.type = type;
    this.description = description;
    this.prerequisites = prerequisites;
    this.learningResources = learningResources;
    this.createdAt = createdAt;
  }
}
