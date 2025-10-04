import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LearningResourceDto {
  @ApiProperty({
    description: 'Unique identifier for the learning resource',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  resourceId: string;

  @ApiProperty({
    description: 'Name of the learning resource',
    example: 'Fractions Video Tutorial',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the learning resource',
    example: 'video',
    enum: ['video', 'document', 'audio', 'interactive', 'quiz'],
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Description of the learning resource',
    example: 'A comprehensive video tutorial on fraction operations',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL where the resource content is located',
    example: 'https://example.com/resources/fractions-video',
  })
  url?: string;

  @ApiPropertyOptional({
    description: 'Whether the resource is publicly accessible',
    example: true,
  })
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Price of the resource (if not free)',
    example: 9.99,
  })
  price?: number;

  @ApiPropertyOptional({
    description: 'Tags associated with the resource',
    type: [String],
    example: ['mathematics', 'fractions', 'tutorial'],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Grade level for this resource',
    example: 'Grade 8',
  })
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'Subject area for this resource',
    example: 'Mathematics',
  })
  subject?: string;

  constructor(
    resourceId: string,
    name: string,
    type: string,
    description?: string,
    url?: string,
    isPublic?: boolean,
    price?: number,
    tags?: string[],
    gradeLevel?: string,
    subject?: string,
  ) {
    this.resourceId = resourceId;
    this.name = name;
    this.type = type;
    this.description = description;
    this.url = url;
    this.isPublic = isPublic;
    this.price = price;
    this.tags = tags;
    this.gradeLevel = gradeLevel;
    this.subject = subject;
  }
}
