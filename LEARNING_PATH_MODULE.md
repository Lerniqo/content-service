# Learning Path Module

This module implements personalized learning path generation integrated with the AI service.

## Overview

The Learning Path module allows users to request personalized learning paths based on their learning goals. The module:
1. Receives user requests through a REST API
2. Publishes learning goal events to Kafka for the AI service to process
3. Returns an immediate acknowledgment to the user
4. Receives generated learning paths from the AI service via Kafka
5. Stores the learning paths in Neo4j database with user relationships

## Architecture

```
User Request → Content Service API → Kafka (learning_path.request topic)
                    ↓
              Immediate Response
                    
AI Service → Kafka (learning_path.response topic) → Content Service Consumer
                                                    ↓
                                              Neo4j Database
```

## API Endpoints

### 1. Request Learning Path Generation

**POST** `/learning-path/request`

Request a personalized learning path from the AI service.

**Request Body:**
```json
{
  "learningGoal": "Learn Python programming",
  "currentLevel": "beginner",
  "preferences": {
    "format": "video",
    "topics": ["basics", "data structures"]
  },
  "availableTime": "2 hours/day"
}
```

**Response (202 Accepted):**
```json
{
  "message": "Learning path generation initiated. You will be notified once it is ready.",
  "requestId": "evt_abc123def",
  "status": "processing",
  "estimatedTime": 30
}
```

### 2. Get User's Learning Paths

**GET** `/learning-path`

Retrieve all learning paths for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "id": "lp_abc123def",
    "userId": "user_789",
    "learningGoal": "Learn Python programming",
    "learningPath": {
      "goal": "Learn Python programming",
      "difficultyLevel": "beginner",
      "totalDuration": "4 weeks",
      "steps": [
        {
          "stepNumber": 1,
          "title": "Python Basics",
          "description": "Learn fundamental concepts",
          "estimatedDuration": "1 week",
          "resources": ["resource-001", "resource-002"],
          "prerequisites": []
        }
      ]
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### 3. Get Learning Path by ID

**GET** `/learning-path/:id`

Retrieve a specific learning path by its ID.

**Response (200 OK):**
```json
{
  "id": "lp_abc123def",
  "userId": "user_789",
  "learningGoal": "Learn Python programming",
  "learningPath": {
    "goal": "Learn Python programming",
    "difficultyLevel": "beginner",
    "totalDuration": "4 weeks",
    "steps": [...]
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Kafka Integration

### Published Topics

#### `learning_path.request`
Published when a user requests a learning path.

**Message Format:**
```json
{
  "eventId": "evt_abc123def",
  "eventType": "learning_path.request",
  "eventData": {
    "request_id": "evt_abc123def",
    "user_id": "user_789",
    "goal": "Learn Python programming",
    "current_level": "beginner",
    "preferences": {
      "format": "video",
      "topics": ["basics", "data structures"]
    },
    "available_time": "2 hours/day",
    "metadata": {}
  },
  "userId": "user_789",
  "metadata": {
    "source": "content-service",
    "version": "1.0.0"
  }
}
```

### Consumed Topics

#### `learning_path.response`
Consumed when the AI service generates a learning path.

**Consumer Group:** `content-service-learning-path-group`

**Message Format:**
```json
{
  "eventId": "evt_response_123",
  "eventType": "learning_path.response",
  "eventData": {
    "request_id": "evt_abc123def",
    "status": "completed",
    "user_id": "user_789",
    "goal": "Learn Python programming",
    "learning_path": {
      "goal": "Learn Python programming",
      "difficulty_level": "beginner",
      "total_duration": "4 weeks",
      "steps": [
        {
          "step_number": 1,
          "title": "Python Basics",
          "description": "Learn fundamental concepts",
          "estimated_duration": "1 week",
          "resources": ["resource-001", "resource-002"],
          "prerequisites": []
        }
      ]
    },
    "metadata": {
      "mastery_scores": {},
      "available_resources": []
    }
  },
  "userId": "ai-service",
  "metadata": {
    "source": "ai-service",
    "request_id": "evt_abc123def"
  }
}
```

## Neo4j Data Model

### Nodes

#### LearningPath
```cypher
(:LearningPath {
  id: String,
  learningGoal: String,
  difficultyLevel: String,
  totalDuration: String,
  createdAt: DateTime,
  updatedAt: DateTime
})
```

#### LearningPathStep
```cypher
(:LearningPathStep {
  id: String,
  stepNumber: Integer,
  title: String,
  description: String,
  estimatedDuration: String,
  resources: [String],
  prerequisites: [Integer]
})
```

### Relationships

```cypher
(User)-[:HAS_LEARNING_PATH]->(LearningPath)
(LearningPath)-[:HAS_STEP]->(LearningPathStep)
(LearningPathStep)-[:USES_RESOURCE]->(Resource)
```

## Configuration

Add the following to your `.env` file:

```bash
# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000
```

## Testing with Kafka CLI

### Publish a learning goal event:
```bash
echo '{
  "eventId": "evt_test123",
  "eventType": "LEARNING_GOAL",
  "eventData": {
    "learningGoal": "Learn Python programming",
    "currentLevel": "beginner",
    "availableTime": "2 hours/day"
  },
  "userId": "user_123",
  "metadata": {
    "source": "test",
    "version": "1.0.0"
  }
}' | kafka-console-producer.sh --broker-list localhost:9092 --topic learning_goal
```

### Consume learning path events:
```bash
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic learning_path \
  --group content-service-learning-path-group \
  --from-beginning
```

## Error Handling

The module implements comprehensive error handling:
- Invalid request data returns 400 Bad Request
- Failed Kafka publishing returns 500 Internal Server Error
- Missing learning paths return 404 Not Found
- Consumer errors are logged but don't retry infinitely to avoid blocking

## Security

- All endpoints require authentication (handled by `RolesGuard`)
- Users can only access their own learning paths
- Learning paths are associated with users in Neo4j

## Future Enhancements

- Progress tracking for learning path steps
- Learning path completion status
- Recommendations based on progress
- Learning path sharing between users
- Custom learning path creation (without AI)
