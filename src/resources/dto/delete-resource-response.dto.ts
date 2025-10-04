import { ApiProperty } from '@nestjs/swagger';

export class DeleteResourceResponseDto {
  @ApiProperty({
    description: 'Success message confirming resource deletion',
    example: 'Resource deleted successfully',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the deleted resource',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  resourceId: string;

  @ApiProperty({
    description: 'Timestamp when the deletion occurred',
    example: '2024-01-16T14:45:00.000Z',
  })
  deletedAt: string;

  constructor(resourceId: string) {
    this.message = 'Resource deleted successfully';
    this.resourceId = resourceId;
    this.deletedAt = new Date().toISOString();
  }
}