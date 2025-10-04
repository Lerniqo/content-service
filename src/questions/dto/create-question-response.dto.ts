/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created question',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Status message indicating successful creation',
    example: 'Question created successfully',
  })
  message: string;

  constructor(id: string, message: string = 'Question created successfully') {
    this.id = id;
    this.message = message;
  }
}