# Learning Path Neo4j Schema

This document describes the Neo4j schema for the Learning Path feature.

## Node Types

### 1. User
Represents a user in the system.

**Properties:**
- `id` (String, Unique, Indexed) - User identifier

### 2. LearningPath
Represents a personalized learning path for a user.

**Properties:**
- `id` (String, Unique, Indexed) - Learning path identifier (format: `lp_<uuid>`)
- `learningGoal` (String) - The learning objective
- `difficultyLevel` (String, Indexed) - Difficulty level (e.g., 'beginner', 'intermediate', 'advanced')
- `totalDuration` (String) - Estimated total duration
- `status` (String, Indexed) - Status of the learning path ('processing', 'completed', etc.)
- `requestId` (String) - Request ID for tracking
- `masteryScores` (String) - JSON string of mastery scores
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

### 3. LearningPathStep
Represents an individual step in a learning path.

**Properties:**
- `id` (String, Unique, Indexed) - Step identifier (format: `<learningPathId>_step_<stepNumber>`)
- `stepNumber` (Integer, Indexed) - Order of the step in the path
- `title` (String) - Step title
- `description` (String) - Detailed description of what to learn
- `estimatedDuration` (String) - Estimated time to complete
- `resources` (Array[String]) - List of resource names/URLs
- `prerequisites` (Array[String]) - List of prerequisite step titles

## Relationships

### 1. HAS_LEARNING_PATH
Connects a User to their LearningPath.

```cypher
(:User)-[:HAS_LEARNING_PATH]->(:LearningPath)
```

**Constraints:**
- One user can only have one active learning path

### 2. HAS_STEP
Connects a LearningPath to its steps.

```cypher
(:LearningPath)-[:HAS_STEP]->(:LearningPathStep)
```

**Constraints:**
- Steps are ordered by `stepNumber` property

## Indexes and Constraints

### Constraints
```cypher
CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
FOR (u:User) REQUIRE u.id IS UNIQUE

CREATE CONSTRAINT learningpath_id_unique IF NOT EXISTS 
FOR (lp:LearningPath) REQUIRE lp.id IS UNIQUE

CREATE CONSTRAINT learningstep_id_unique IF NOT EXISTS 
FOR (s:LearningPathStep) REQUIRE s.id IS UNIQUE
```

### Indexes
```cypher
CREATE INDEX user_id IF NOT EXISTS 
FOR (u:User) ON (u.id)

CREATE INDEX learningpath_id IF NOT EXISTS 
FOR (lp:LearningPath) ON (lp.id)

CREATE INDEX learningpath_status IF NOT EXISTS 
FOR (lp:LearningPath) ON (lp.status)

CREATE INDEX learningpath_difficultyLevel IF NOT EXISTS 
FOR (lp:LearningPath) ON (lp.difficultyLevel)

CREATE INDEX learningstep_id IF NOT EXISTS 
FOR (s:LearningPathStep) ON (s.id)

CREATE INDEX learningstep_stepNumber IF NOT EXISTS 
FOR (s:LearningPathStep) ON (s.stepNumber)
```

## Schema Setup

### Option 1: Run with full database population
```bash
node PopulatingDB/populate-neo4j.js
```
This will clear all existing data and repopulate the database including the Learning Path schema.

### Option 2: Add Learning Path schema only (preserves existing data)
```bash
node PopulatingDB/add-learning-path-schema.js
```
This will only add the indexes and constraints for Learning Path without affecting existing data.

## Example Usage

### Create a Learning Path with Steps
```cypher
// Create user and learning path
MATCH (u:User {id: $userId})
CREATE (lp:LearningPath {
  id: $learningPathId,
  learningGoal: $learningGoal,
  difficultyLevel: $difficultyLevel,
  totalDuration: $totalDuration,
  status: 'completed',
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (u)-[:HAS_LEARNING_PATH]->(lp)

// Create steps
WITH lp
UNWIND $steps AS step
CREATE (s:LearningPathStep {
  id: lp.id + '_step_' + toString(step.stepNumber),
  stepNumber: step.stepNumber,
  title: step.title,
  description: step.description,
  estimatedDuration: step.estimatedDuration,
  resources: step.resources,
  prerequisites: step.prerequisites
})
CREATE (lp)-[:HAS_STEP]->(s)

RETURN lp
```

### Query a User's Learning Path
```cypher
MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
WITH lp, step
ORDER BY step.stepNumber
RETURN 
  lp.id as id,
  lp.learningGoal as learningGoal,
  lp.difficultyLevel as difficultyLevel,
  lp.totalDuration as totalDuration,
  lp.status as status,
  COLLECT({
    stepNumber: step.stepNumber,
    title: step.title,
    description: step.description,
    estimatedDuration: step.estimatedDuration,
    resources: step.resources,
    prerequisites: step.prerequisites
  }) as steps
```

## Schema Diagram

```
┌──────────┐
│   User   │
│          │
│  id (U)  │
└─────┬────┘
      │
      │ HAS_LEARNING_PATH
      │
      ▼
┌─────────────────┐
│  LearningPath   │
│                 │
│  id (U)         │
│  learningGoal   │
│  difficulty (I) │
│  totalDuration  │
│  status (I)     │
│  createdAt      │
│  updatedAt      │
└────────┬────────┘
         │
         │ HAS_STEP
         │
         ▼
┌──────────────────────┐
│  LearningPathStep    │
│                      │
│  id (U)              │
│  stepNumber (I)      │
│  title               │
│  description         │
│  estimatedDuration   │
│  resources[]         │
│  prerequisites[]     │
└──────────────────────┘

Legend:
(U) = Unique constraint
(I) = Indexed
```
