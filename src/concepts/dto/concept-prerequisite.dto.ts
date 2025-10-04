import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConceptPrerequisiteDto {
  @ApiProperty({
    description: 'Unique identifier for the prerequisite concept',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  conceptId: string;

  @ApiProperty({
    description: 'Name of the prerequisite concept',
    example: 'Basic Addition (ATM001)',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the prerequisite concept',
    example: 'Atom',
    enum: ['Subject', 'Matter', 'Molecule', 'Atom', 'Particle'],
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Description of the prerequisite concept',
    example: 'Fundamental addition operations with whole numbers',
  })
  description?: string;

  constructor(
    conceptId: string,
    name: string,
    type: string,
    description?: string,
  ) {
    this.conceptId = conceptId;
    this.name = name;
    this.type = type;
    this.description = description;
  }
}
