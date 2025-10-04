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
    description: 'Presigned URL for uploading the resource file',
    example: 'https://storage.cloud.com/bucket/upload/abc123?signature=xyz789',
  })
  @IsString()
  @IsUrl()
  uploadUrl: string;

  constructor(resourceId: string, uploadUrl: string) {
    this.resourceId = resourceId;
    this.uploadUrl = uploadUrl;
  }
}
