/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsDate,
  IsNumber,
  IsUrl,
  IsUUID,
  ArrayMinSize,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Constants for graph node types - these represent actual Neo4j node labels
export const CONCEPT_TYPES = [
  'Subject',
  'Matter',
  'Molecule',
  'Atom',
  'Particle',
] as const;
export const RESOURCE_TYPES = [
  'video',
  'document',
  'image',
  'audio',
  'interactive',
  'quiz',
  'assignment',
  'other',
] as const;
export const CONTEST_TYPES = [
  'programming',
  'quiz',
  'project',
  'hackathon',
] as const;
export const CONTEST_STATUSES = [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
] as const;

export type ConceptType = (typeof CONCEPT_TYPES)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ContestType = (typeof CONTEST_TYPES)[number];
export type ContestStatus = (typeof CONTEST_STATUSES)[number];

// Base interfaces for Neo4j node types - matching database schema
export interface SyllabusConcept {
  conceptId: string;
  name: string;
  type: ConceptType;
  description?: string;
  createdAt?: Date;
}

// Legacy interface for backwards compatibility
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
  resourceId: string;
  name: string;
  type: ResourceType;
  description?: string;
  url: string;
  isPublic: boolean;
  price?: number;
  tags?: string[];
  createdAt?: Date;
  gradeLevel?: string;
  subject?: string;
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
