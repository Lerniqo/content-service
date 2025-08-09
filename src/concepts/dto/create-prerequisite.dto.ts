import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Length } from "class-validator";

export class CreatePrerequisiteDto {
    @ApiProperty({
        description: 'The ID of the prerequisite concept',
        example: 'prerequisite-concept-123',
    })
    @IsString({ message: 'Prerequisite ID must be a string' })
    @IsNotEmpty({ message: 'Prerequisite ID is required' })
    @Length(1, 100, { message: 'Prerequisite ID must be between 1 and 100 characters' })
    prerequisiteId: string;
}
