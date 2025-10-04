/* eslint-disable prettier/prettier */
// Constants for resource types - these represent valid resource types for uploading
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

export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Base interfaces for Neo4j node types - matching database schema

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

// Question interface for quiz questions
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

// Quiz interface for quiz management
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimit: number; // in seconds
  createdAt?: Date;
  updatedAt?: Date;
}


