# Contests Module

## Overview
The Contests module handles all contest-related functionality in the Content Service. Contests are published by teachers and allow students to participate before the start date.

## Features

### Contest Management
- **Create Contest**: Teachers can create contests with up to 5 tasks
- **Update Contest**: Teachers can modify existing contests
- **Delete Contest**: Teachers can remove contests
- **View Contests**: All users can view contests
- **Check Participation**: Students can check if they can participate in a contest

### Contest Structure

#### Contest Properties
- `contestId`: Unique identifier
- `contestName`: Name of the contest
- `subTitle`: Optional subtitle
- `startDate`: Contest start date (ISO 8601 format)
- `endDate`: Contest end date (ISO 8601 format)
- `tasks`: Array of tasks (1-5 tasks)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Task Properties
- `taskId`: Unique identifier
- `title`: Task title
- `type`: Task type (`1Vs1_tasks` or `AI_Questions_tasks`)
- `description`: Task description
- `goal`: Number of times the task needs to be completed

## API Endpoints

### POST /contests
Create a new contest (Teacher/Admin only)

**Request Body:**
```json
{
  "contestName": "Mathematics Championship 2025",
  "subTitle": "Test your mathematics skills",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",
  "tasks": [
    {
      "title": "Complete 5 One-on-One Battles",
      "type": "1Vs1_tasks",
      "description": "Win 5 one-on-one battles",
      "goal": 5
    }
  ]
}
```

### GET /contests
Get all contests

### GET /contests/available
Get contests available for participation (not yet started)

### GET /contests/:contestId
Get a specific contest by ID

### GET /contests/:contestId/can-participate
Check if a student can participate in a contest

**Response:**
```json
{
  "canParticipate": true,
  "message": "You can participate in this contest."
}
```

### PUT /contests/:contestId
Update a contest (Teacher/Admin only)

### DELETE /contests/:contestId
Delete a contest (Teacher/Admin only)

## Business Rules

1. **Teacher-Only Creation**: Only teachers and admins can create, update, or delete contests
2. **Date Validation**: Start date must be before end date
3. **Task Limits**: Maximum 5 tasks per contest, minimum 1 task
4. **Participation Window**: Students can only participate in contests that haven't started yet
5. **Task Types**: Two types of tasks are supported:
   - `1Vs1_tasks`: One-on-one battle tasks
   - `AI_Questions_tasks`: AI question tasks

## Database Schema

The module uses Neo4j with the following node structure:

```cypher
(:Contest {
  contestId: String,
  contestName: String,
  subTitle: String?,
  startDate: String,
  endDate: String,
  createdAt: String,
  updatedAt: String
})-[:HAS_TASK]->(:Task {
  taskId: String,
  title: String,
  type: String,
  description: String,
  goal: Number
})
```

## Progress Tracking

Task progress is tracked by the Progress Service. The Content Service only stores contest and task definitions.

## Testing

Run tests for the contests module:
```bash
pnpm test contests
```

All tests include:
- Service layer unit tests (contests.service.spec.ts)
- Controller layer unit tests (contests.controller.spec.ts)

## Integration

The module is integrated into the main application through:
- `ContestsModule` imported in `AppModule`
- Uses `Neo4jModule` for database operations
- Uses `RolesGuard` for authorization
- Uses `PinoLogger` for logging
