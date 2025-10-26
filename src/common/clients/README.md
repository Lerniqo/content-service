# Progress Service Client

A comprehensive client for communicating with the Progress Service API. This client provides methods to track user progress across concepts, learning paths, and quizzes.

## Features

- **Concept Progress Tracking**: Track user completion and mastery of individual concepts
- **Learning Path Progress**: Monitor user progress through learning paths with step-by-step tracking
- **Quiz Progress**: Record quiz scores, attempts, and completion status
- **Progress Statistics**: Get overall progress statistics and analytics
- **Batch Operations**: Support for batch updates of multiple progress records
- **Error Handling**: Robust error handling with detailed logging
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## Installation

The client is automatically available when you import the `ProgressServiceClientModule` in your module:

```typescript
import { Module } from '@nestjs/common';
import { ProgressServiceClientModule } from '../common/clients/progress-service-client.module';

@Module({
  imports: [ProgressServiceClientModule],
  // ... other module configuration
})
export class YourModule {}
```

## Configuration

Add the Progress Service URL to your environment variables:

```env
PROGRESS_SERVICE_URL=http://localhost:3001
```

If not provided, it defaults to `http://localhost:3001`.

## Usage

### Inject the Client

```typescript
import { Injectable } from '@nestjs/common';
import { ProgressServiceClient } from '../common/clients/progress-service.client';

@Injectable()
export class YourService {
  constructor(
    private readonly progressServiceClient: ProgressServiceClient,
  ) {}
}
```

### Concept Progress

#### Get User's Progress for a Concept

```typescript
const progress = await this.progressServiceClient.getUserConceptProgress(userId, conceptId);
if (progress) {
  console.log(`User has ${progress.completionPercentage}% completion`);
}
```

#### Update Concept Progress

```typescript
await this.progressServiceClient.updateConceptProgress(userId, conceptId, {
  completionPercentage: 75,
  timeSpent: 120, // minutes
  masteryLevel: 'intermediate'
});
```

#### Mark Concept as Completed

```typescript
await this.progressServiceClient.markConceptCompleted(userId, conceptId, 180);
```

#### Check if Concept is Completed

```typescript
const isCompleted = await this.progressServiceClient.isConceptCompleted(userId, conceptId);
```

#### Record Time Spent

```typescript
// Add 30 minutes to existing time spent
await this.progressServiceClient.recordTimeSpent(userId, conceptId, 30);
```

### Learning Path Progress

#### Get Learning Path Progress

```typescript
const pathProgress = await this.progressServiceClient.getLearningPathProgress(userId, learningPathId);
if (pathProgress) {
  console.log(`Completed ${pathProgress.completedSteps}/${pathProgress.totalSteps} steps`);
}
```

#### Update Learning Path Progress

```typescript
await this.progressServiceClient.updateLearningPathProgress(userId, learningPathId, {
  completedSteps: 5,
  currentStep: 6,
  overallProgress: 50,
  estimatedTimeRemaining: 300
});
```

### Quiz Progress

#### Get Quiz Progress

```typescript
const quizProgress = await this.progressServiceClient.getQuizProgress(userId, quizId);
if (quizProgress) {
  console.log(`Score: ${quizProgress.score}/${quizProgress.maxScore}`);
}
```

#### Update Quiz Progress

```typescript
await this.progressServiceClient.updateQuizProgress(userId, quizId, {
  score: 85,
  maxScore: 100,
  attempts: 2,
  timeSpent: 45,
  isCompleted: true
});
```

### Progress Statistics

#### Get Overall Statistics

```typescript
const stats = await this.progressServiceClient.getProgressStats(userId);
console.log(`Overall progress: ${stats.overallProgress}%`);
console.log(`Completed concepts: ${stats.completedConcepts}/${stats.totalConcepts}`);
```

### Batch Operations

#### Batch Update Multiple Progress Records

```typescript
await this.progressServiceClient.batchUpdateProgress(userId, [
  {
    conceptId: 'concept1',
    progressData: { completionPercentage: 100, isCompleted: true }
  },
  {
    conceptId: 'concept2',
    progressData: { completionPercentage: 50, timeSpent: 60 }
  }
]);
```

### Create New Progress Record

```typescript
await this.progressServiceClient.createProgress({
  userId: 'user123',
  conceptId: 'concept456',
  completionPercentage: 25,
  timeSpent: 30,
  masteryLevel: 'beginner'
});
```

### Delete Progress

```typescript
// Delete concept progress
await this.progressServiceClient.deleteProgress(userId, conceptId);

// Delete quiz progress
await this.progressServiceClient.deleteProgress(userId, undefined, quizId);

// Delete learning path progress
await this.progressServiceClient.deleteProgress(userId, undefined, undefined, learningPathId);
```

## Data Types

### UserProgress

```typescript
interface UserProgress {
  userId: string;
  conceptId: string;
  completionPercentage: number;
  timeSpent: number; // in minutes
  lastAccessedAt: string;
  isCompleted: boolean;
  masteryLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
```

### LearningPathProgress

```typescript
interface LearningPathProgress {
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
```

### QuizProgress

```typescript
interface QuizProgress {
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  attempts: number;
  timeSpent: number; // in minutes
  completedAt?: string;
  isCompleted: boolean;
}
```

### ProgressStats

```typescript
interface ProgressStats {
  totalConcepts: number;
  completedConcepts: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalTimeSpent: number; // in minutes
  averageScore: number;
  overallProgress: number; // percentage
}
```

## Error Handling

The client includes comprehensive error handling:

- **404 Errors**: Methods return `null` when progress records are not found
- **Other HTTP Errors**: Throws descriptive error messages
- **Network Errors**: Proper error propagation with logging
- **Validation Errors**: Clear error messages for invalid data

## Example Integration

Here's an example of how to integrate the progress client in the Learning Path Service:

```typescript
@Injectable()
export class LearningPathService {
  constructor(
    private readonly progressServiceClient: ProgressServiceClient,
    // ... other dependencies
  ) {}

  async completeStep(userId: string, learningPathId: string, stepNumber: number) {
    try {
      // Update learning path progress
      await this.progressServiceClient.updateLearningPathProgress(userId, learningPathId, {
        completedSteps: stepNumber,
        currentStep: stepNumber + 1,
        lastAccessedAt: new Date().toISOString()
      });

      // Mark associated concepts as completed
      const concepts = await this.getStepConcepts(stepNumber);
      for (const conceptId of concepts) {
        await this.progressServiceClient.markConceptCompleted(userId, conceptId);
      }
    } catch (error) {
      this.logger.error('Failed to update progress', error);
      // Handle error appropriately
    }
  }
}
```

## Testing

The client includes comprehensive unit tests. Run tests with:

```bash
npm test src/common/clients/progress-service.client.spec.ts
```

## API Endpoints

The client communicates with the following Progress Service endpoints:

- `GET /progress/users/{userId}` - Get all user progress
- `GET /progress/users/{userId}/concepts/{conceptId}` - Get concept progress
- `PUT /progress/users/{userId}/concepts/{conceptId}` - Update concept progress
- `GET /progress/users/{userId}/learning-paths/{pathId}` - Get learning path progress
- `PUT /progress/users/{userId}/learning-paths/{pathId}` - Update learning path progress
- `GET /progress/users/{userId}/quizzes/{quizId}` - Get quiz progress
- `PUT /progress/users/{userId}/quizzes/{quizId}` - Update quiz progress
- `GET /progress/users/{userId}/stats` - Get progress statistics
- `POST /progress` - Create new progress record
- `POST /progress/users/{userId}/batch` - Batch update progress
- `DELETE /progress/users/{userId}/concepts/{conceptId}` - Delete concept progress

## Logging

The client includes detailed logging at DEBUG and INFO levels:

- Request/response details
- Error messages with context
- Performance tracking
- Progress update confirmations

All logs use the NestJS Logger with the context `ProgressServiceClient`.