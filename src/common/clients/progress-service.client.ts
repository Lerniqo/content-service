import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface UserProgress {
  userId: string;
  conceptId: string;
  completionPercentage: number;
  timeSpent: number; // in minutes
  lastAccessedAt: string;
  isCompleted: boolean;
  masteryLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface LearningPathProgress {
  userId: string;
  learningPathId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  overallProgress: number; // percentage
  estimatedTimeRemaining: number; // in minutes
  lastAccessedAt: string;
  isCompleted: boolean;
}

export interface QuizProgress {
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  attempts: number;
  timeSpent: number; // in minutes
  completedAt?: string;
  isCompleted: boolean;
}

export interface CreateProgressDto {
  userId: string;
  conceptId?: string;
  learningPathId?: string;
  quizId?: string;
  completionPercentage?: number;
  timeSpent?: number;
  masteryLevel?: string;
  score?: number;
  maxScore?: number;
}

export interface UpdateProgressDto {
  completionPercentage?: number;
  timeSpent?: number;
  masteryLevel?: string;
  score?: number;
  isCompleted?: boolean;
}

export interface ProgressStats {
  totalConcepts: number;
  completedConcepts: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalTimeSpent: number; // in minutes
  averageScore: number;
  overallProgress: number; // percentage
}

@Injectable()
export class ProgressServiceClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(ProgressServiceClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('PROGRESS_SERVICE_URL') ||
      'http://localhost:3001';
    this.logger.log(
      `Progress Service initialized with baseUrl: ${this.baseUrl}`,
    );
  }

  async getUserCanHaveLearningPath(userId: string): Promise<boolean> {
    const url = `${this.baseUrl}/events/user/${userId}/is-personalization-ready`;
    this.logger.debug(
      `Fetching if user can have learning path from URL: ${url}`,
    );
    try {
      const response: AxiosResponse<{ isPersonalizationReady: boolean }> =
        await firstValueFrom(this.httpService.get(url));
      return response.data.isPersonalizationReady;
    } catch (error) {
      this.logger.error(
        `Error fetching if user can have learning path: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
