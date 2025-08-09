import { IsString, IsBoolean, IsArray, IsOptional, IsDate, IsNumber, IsUrl, IsUUID, ArrayMinSize, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Constants for graph node types - these represent actual Neo4j node labels
export const CONCEPT_TYPES = ['topic', 'subtopic', 'skill', 'knowledge_point'] as const;
export const RESOURCE_TYPES = ['video', 'document', 'article', 'presentation', 'interactive', 'assignment'] as const;
export const CONTEST_TYPES = ['programming', 'quiz', 'project', 'hackathon'] as const;
export const CONTEST_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'] as const;

export type ConceptType = typeof CONCEPT_TYPES[number];
export type ResourceType = typeof RESOURCE_TYPES[number];
export type ContestType = typeof CONTEST_TYPES[number];
export type ContestStatus = typeof CONTEST_STATUSES[number];

// Base interfaces for Neo4j node types
export interface Concept {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
}

export interface Student extends User {}

export interface Teacher extends User {}

export interface Admin extends User {}

export interface Resource {
  id: string;
  name: string;
  type: string;
  description?: string;
  url: string;
  isPublic: boolean;
  tags?: string[];
  createdAt?: Date;
  author: Teacher | Admin;
}

export interface SyllabusContent {
  id: string;
  name: string;
  description?: string;
  topics: string[];
  url: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimit: number; // in seconds
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Contest {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  type: string;
  status: string; // e.g., 'upcoming', 'ongoing', 'completed'
  createdAt?: Date;
  updatedAt?: Date;
}

// Validation classes for Neo4j node creation and updates

export class ConceptNode implements Concept {
  @ApiProperty({ description: 'Unique identifier for the concept node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name of the concept' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'topic'
  })
  @IsString()
  @IsIn(CONCEPT_TYPES)
  type: string;
}

export class CreateConceptNode {
  @ApiProperty({ description: 'Name of the concept' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'topic'
  })
  @IsString()
  @IsIn(CONCEPT_TYPES)
  type: string;
}

export class UpdateConceptNode {
  @ApiPropertyOptional({ description: 'Name of the concept' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Type of the concept',
    enum: CONCEPT_TYPES,
    example: 'topic'
  })
  @IsOptional()
  @IsString()
  @IsIn(CONCEPT_TYPES)
  type?: string;
}

export class UserNode implements User {
  @ApiProperty({ description: 'Unique identifier for the user node' })
  @IsString()
  @IsUUID()
  id: string;
}

export class StudentNode extends UserNode implements Student {}

export class TeacherNode extends UserNode implements Teacher {}

export class AdminNode extends UserNode implements Admin {}

export class ResourceNode implements Resource {
  @ApiProperty({ description: 'Unique identifier for the resource node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name of the resource' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Type of the resource',
    enum: RESOURCE_TYPES,
    example: 'video'
  })
  @IsString()
  @IsIn(RESOURCE_TYPES)
  type: string;

  @ApiPropertyOptional({ description: 'Description of the resource' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'URL to access the resource' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Whether the resource is publicly accessible' })
  @IsBoolean()
  isPublic: boolean;

  @ApiPropertyOptional({ 
    type: [String], 
    description: 'Tags associated with the resource' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Creation date of the resource' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @ApiProperty({ description: 'Author of the resource (Teacher or Admin)' })
  author: Teacher | Admin;
}

export class SyllabusContentNode implements SyllabusContent {
  @ApiProperty({ description: 'Unique identifier for the syllabus content node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name of the syllabus content' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the syllabus content' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    type: [String], 
    description: 'List of topics covered in the syllabus' 
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  topics: string[];

  @ApiProperty({ description: 'URL to access the syllabus content' })
  @IsUrl()
  url: string;
}

export class QuestionNode implements Question {
  @ApiProperty({ description: 'Unique identifier for the question node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'The question text' })
  @IsString()
  questionText: string;

  @ApiProperty({ 
    type: [String], 
    description: 'Available answer options' 
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options: string[];

  @ApiProperty({ description: 'The correct answer' })
  @IsString()
  correctAnswer: string;

  @ApiPropertyOptional({ description: 'Explanation for the correct answer' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ 
    type: [String], 
    description: 'Tags associated with the question' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Creation date of the question' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Last update date of the question' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;
}

export class QuizNode implements Quiz {
  @ApiProperty({ description: 'Unique identifier for the quiz node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Title of the quiz' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the quiz' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Time limit for the quiz in seconds',
    minimum: 60,
    maximum: 7200 
  })
  @IsNumber()
  @Min(60) // At least 1 minute
  @Max(7200) // Maximum 2 hours
  timeLimit: number;

  @ApiPropertyOptional({ description: 'Creation date of the quiz' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Last update date of the quiz' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;
}

export class ContestNode implements Contest {
  @ApiProperty({ description: 'Unique identifier for the contest node' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Title of the contest' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the contest' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Start time of the contest' })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: 'End time of the contest' })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ 
    description: 'Maximum number of participants allowed',
    minimum: 1,
    maximum: 10000 
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxParticipants: number;

  @ApiProperty({ 
    description: 'Type of the contest',
    enum: CONTEST_TYPES,
    example: 'programming'
  })
  @IsString()
  @IsIn(CONTEST_TYPES)
  type: string;

  @ApiProperty({ 
    description: 'Current status of the contest',
    enum: CONTEST_STATUSES,
    example: 'upcoming'
  })
  @IsString()
  @IsIn(CONTEST_STATUSES)
  status: string;

  @ApiPropertyOptional({ description: 'Creation date of the contest' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Last update date of the contest' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;
}


