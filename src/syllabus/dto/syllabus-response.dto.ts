/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { SyllabusConceptDto } from './syllabus-concept.dto';

export class SyllabusResponseDto {
  @ApiProperty({
    description: 'Complete syllabus tree structure',
    type: [SyllabusConceptDto],
  })
  syllabus: SyllabusConceptDto[];

  @ApiProperty({
    description: 'Total number of concepts in the syllabus',
    example: 150,
  })
  totalConcepts: number;

  @ApiProperty({
    description: 'Timestamp when the syllabus was retrieved',
    example: '2024-10-04T10:30:00Z',
  })
  retrievedAt: string;

  constructor(syllabus: SyllabusConceptDto[], totalConcepts: number) {
    this.syllabus = syllabus;
    this.totalConcepts = totalConcepts;
    this.retrievedAt = new Date().toISOString();
  }
}