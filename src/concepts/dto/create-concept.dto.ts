import { Concept, CONCEPT_TYPES } from "../../libs/shared-types";
import type { ConceptType } from "../../libs/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsIn, Length, IsOptional } from "class-validator";


export class CreateConceptDto implements Concept {

  @ApiProperty({
    description: 'Unique identifier for the concept',
    example: 'concept-123',
  })
  @IsString({ message: 'ID must be a string' })
  @IsNotEmpty({ message: 'ID is required' })
  @Length(1, 100, { message: 'ID must be between 1 and 100 characters' })
  id: string;

  @ApiProperty({
    description: 'Name of the concept',
    example: 'Matter',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 255, { message: 'Name must be between 2 and 255 characters' })
  name: string;

  @ApiProperty({
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'Matter',
  })
  @IsString({ message: 'Type must be a string' })
  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(CONCEPT_TYPES, { message: `Type must be one of: ${CONCEPT_TYPES.join(', ')}` })
  type: ConceptType;

    @ApiProperty({
        description: 'Optional parent concept ID to create a relationship',
        example: 'parent-concept-123',
        required: false,
    })
    @IsString({ message: 'Parent ID must be a string' })
    @IsOptional()
  parentId?: string;

}
