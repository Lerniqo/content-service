import { IsString, IsBoolean, IsArray, IsOptional, IsDate, IsNumber, IsUrl, IsUUID, ArrayMinSize, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Constants for graph node types - these represent actual Neo4j node labels
export const CONCEPT_TYPES = ['Matter', 'Molecule', 'Atom', 'Particle'] as const;
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

