import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateResourceResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created resource',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  resourceId: string;

  @ApiProperty({
    description: 'The actual resource URL provided during creation',
    example:
      'https://topicpdfs.s3.eu-north-1.amazonaws.com/Grade%206/grade-6-Rectilinear%20Plane%20Figures.pdf',
  })
  @IsString()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Presigned URL for uploading the resource file (if needed)',
    example: 'https://storage.cloud.com/bucket/upload/abc123?signature=xyz789',
  })
  @IsString()
  @IsUrl()
  uploadUrl: string;

  constructor(resourceId: string, url: string, uploadUrl: string) {
    this.resourceId = resourceId;
    this.url = url;
    this.uploadUrl = uploadUrl;
  }
}
