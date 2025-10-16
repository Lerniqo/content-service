# Learning Path Data Model

## Overview
This document explains the data model for learning paths and how data from the AI service is stored in Neo4j.

## Data Flow

### 1. AI Service Output Format
The AI service generates learning paths with the following structure:

```json
{
  "user_id": "cmex75vci0001k401yk6ux262",
  "learning_goal": "what is a circle",
  "learning_path": {
    "goal": "Master the concept of a circle",
    "difficulty_level": "beginner",
    "total_duration": "Approximately 1 week (flexible)",
    "steps": [
      {
        "step_number": 1,
        "title": "Introduction to Shapes",
        "description": "Learn about basic geometric shapes...",
        "estimated_duration": "1 day",
        "resources": [
          "Khan Academy: Introduction to Geometry (Shapes)",
          "YouTube: Basic Shapes for Kids"
        ],
        "prerequisites": []
      },
      {
        "step_number": 2,
        "title": "Defining a Circle: The Basics",
        "description": "Understand the definition of a circle...",
        "estimated_duration": "1 day",
        "resources": [
          "Math is Fun: Circle",
          "YouTube: What is a Circle? (Definition & Parts)"
        ],
        "prerequisites": ["Introduction to Shapes"]
      }
    ]
  },
  "mastery_scores": {},
  "available_resources": []
}
```

### 2. Content Service Transformation

The content service transforms this data from snake_case to camelCase:

```typescript
const transformedSteps = learningPathData.learning_path.steps.map((step: any) => ({
  stepNumber: step.step_number,
  title: step.title,
  description: step.description,
  estimatedDuration: step.estimated_duration,
  resources: step.resources || [],
  prerequisites: step.prerequisites || []
}));
```

### 3. Neo4j Storage

The data is stored in Neo4j with the following structure:

```cypher
(:User {id: "cmex75vci0001k401yk6ux262"})
  -[:HAS_LEARNING_PATH]->
(:LearningPath {
  id: "lp_abc123",
  learningGoal: "what is a circle",
  difficultyLevel: "beginner",
  totalDuration: "Approximately 1 week (flexible)",
  status: "completed",
  requestId: "evt_xyz789",
  masteryScores: "{}",
  createdAt: "2025-10-16T10:49:05.536Z",
  updatedAt: "2025-10-16T10:49:05.536Z"
})
  -[:HAS_STEP]->
(:LearningPathStep {
  id: "lp_abc123_step_1",
  stepNumber: 1,
  title: "Introduction to Shapes",
  description: "Learn about basic geometric shapes...",
  estimatedDuration: "1 day",
  resources: ["Khan Academy: Introduction to Geometry (Shapes)", "YouTube: Basic Shapes for Kids"],
  prerequisites: []
})
```

## Important Notes

### Resources as Strings
Currently, the AI service returns **resource names/descriptions** (e.g., "Khan Academy: Introduction to Geometry") rather than Neo4j resource node IDs. These are stored as **string arrays** on the `LearningPathStep` nodes.

**Implications:**
- ✅ Simple to store and retrieve
- ✅ Works with current AI service output
- ❌ Not linked to actual Resource nodes in Neo4j
- ❌ Frontend must display these as text strings, not fetch Resource details

**Future Enhancement:**
If you want to link to actual Resource nodes, you would need to:
1. Either have the AI service return resource IDs
2. Or implement a mapping service that converts resource names to IDs
3. Update the Cypher query to create relationships: `(step)-[:USES_RESOURCE]->(resource)`

### Prerequisites as Strings
Similarly, prerequisites are currently stored as **step title strings** (e.g., "Introduction to Shapes") rather than step numbers.

**Implications:**
- ✅ Human-readable
- ❌ Harder to query relationships between steps
- ❌ Could break if step titles change

**Recommendation:**
Consider having the AI service return prerequisite step numbers instead:
```json
{
  "step_number": 2,
  "prerequisites": [1]  // Instead of ["Introduction to Shapes"]
}
```

## Current Data Model Summary

### LearningPath Node
| Property | Type | Example | Description |
|----------|------|---------|-------------|
| id | String | "lp_abc123" | Unique identifier |
| learningGoal | String | "what is a circle" | User's learning goal |
| difficultyLevel | String | "beginner" | Difficulty level |
| totalDuration | String | "1 week" | Estimated total duration |
| status | String | "processing"/"completed" | Generation status |
| requestId | String | "evt_xyz789" | Request tracking ID |
| masteryScores | String (JSON) | "{}" | User's mastery scores |
| createdAt | DateTime | ISO 8601 | Creation timestamp |
| updatedAt | DateTime | ISO 8601 | Last update timestamp |

### LearningPathStep Node
| Property | Type | Example | Description |
|----------|------|---------|-------------|
| id | String | "lp_abc123_step_1" | Unique identifier |
| stepNumber | Integer | 1 | Step sequence number |
| title | String | "Introduction to Shapes" | Step title |
| description | String | "Learn about..." | Step description |
| estimatedDuration | String | "1 day" | Time estimate |
| resources | String[] | ["Khan Academy...", "YouTube..."] | Resource names/URLs |
| prerequisites | String[] | ["Introduction to Shapes"] | Prerequisite step titles |

## Relationships

```
(User)-[:HAS_LEARNING_PATH]->(LearningPath)
(LearningPath)-[:HAS_STEP]->(LearningPathStep)
```

Note: No `USES_RESOURCE` or `REQUIRES_STEP` relationships are currently created because resources and prerequisites are stored as string arrays.

## API Response Format

### Processing State
```json
{
  "id": "lp_abc123",
  "userId": "cmex75vci0001k401yk6ux262",
  "learningGoal": "what is a circle",
  "status": "processing",
  "requestId": "evt_xyz789",
  "learningPath": null,
  "createdAt": "2025-10-16T10:49:05.536Z",
  "updatedAt": "2025-10-16T10:49:05.536Z"
}
```

### Completed State
```json
{
  "id": "lp_abc123",
  "userId": "cmex75vci0001k401yk6ux262",
  "learningGoal": "what is a circle",
  "status": "completed",
  "learningPath": {
    "goal": "Master the concept of a circle",
    "difficultyLevel": "beginner",
    "totalDuration": "Approximately 1 week (flexible)",
    "steps": [
      {
        "stepNumber": 1,
        "title": "Introduction to Shapes",
        "description": "Learn about basic geometric shapes...",
        "estimatedDuration": "1 day",
        "resources": ["Khan Academy: Introduction to Geometry (Shapes)"],
        "prerequisites": []
      }
    ]
  },
  "masteryScores": {},
  "createdAt": "2025-10-16T10:49:05.536Z",
  "updatedAt": "2025-10-16T10:49:05.536Z"
}
```

## Common Issues

### Issue: "Empty resources array"
**Symptom:** Debug logs show empty arrays for resources
**Solution:** This is normal. Not all steps have resources. The code handles empty arrays correctly.

### Issue: "Prerequisites not working"
**Symptom:** Can't query step relationships
**Solution:** Prerequisites are stored as strings, not relationships. You need to match by title or implement step number-based prerequisites.

### Issue: "Can't fetch resource details"
**Symptom:** Frontend can't get Resource node data
**Solution:** Resources are stored as strings, not IDs. If you need Resource nodes, implement a mapping service or change AI service output.
