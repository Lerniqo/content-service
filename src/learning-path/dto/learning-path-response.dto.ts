/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class LearningPathResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Learning path generation initiated',
  })
  message: string;

  @ApiProperty({
    description: 'Request ID for tracking',
    example: 'evt_abc123def',
  })
  requestId: string;

  @ApiProperty({
    description: 'Status of the request',
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    description: 'Estimated time for completion in seconds',
    example: 30,
  })
  estimatedTime: number;
}
