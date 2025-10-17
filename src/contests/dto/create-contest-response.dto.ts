import { ApiProperty } from '@nestjs/swagger';

export class CreateContestResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the created contest',
    example: 'contest-12345',
  })
  contestId: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Contest created successfully',
  })
  message: string;
}
