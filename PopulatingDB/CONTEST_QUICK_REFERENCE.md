# Contest Population Script - Quick Reference

## Files Created

1. **`populate-contests.js`** - Main population script
2. **`CONTEST_SCHEMA.md`** - Detailed schema documentation

## Running the Script

```bash
node PopulatingDB/populate-contests.js
```

## What the Script Does

### 1. Creates Indexes and Constraints
- Contest nodes: `contestId` (unique), `contestName`, `startDate`, `endDate`
- Task nodes: `taskId` (unique), `type`
- ContestParticipation nodes: `userId`, `status`

### 2. Creates Sample Data
- 3 sample contests with varying dates
- 8 tasks total across all contests
- Mix of task types (1Vs1_tasks and AI_Questions_tasks)

### 3. Node Types Created

#### Contest
```javascript
{
  contestId: String,      // UUID
  contestName: String,
  subTitle: String,       // Optional
  startDate: DateTime,
  endDate: DateTime,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### Task
```javascript
{
  taskId: String,         // UUID
  title: String,
  type: String,          // "1Vs1_tasks" | "AI_Questions_tasks"
  description: String,
  goal: Number           // Target count
}
```

### 4. Relationship Types Created

#### HAS_TASK
```cypher
(Contest)-[:HAS_TASK]->(Task)
```

#### PARTICIPATES_IN (for future use)
```cypher
(User)-[:PARTICIPATES_IN {joinedAt, status}]->(Contest)
```

#### COMPLETED_TASK (for future use)
```cypher
(User)-[:COMPLETED_TASK {completedAt, progress, contestId}]->(Task)
```

## Sample Contests Created

### 1. Mathematics Championship 2025
- **Period:** Nov 1-30, 2025
- **Tasks:** 3
  - Complete 5 One-on-One Battles (1Vs1_tasks, goal: 5)
  - Answer 20 AI Questions (AI_Questions_tasks, goal: 20)
  - Win 3 Consecutive Battles (1Vs1_tasks, goal: 3)

### 2. Science Quiz Challenge
- **Period:** Dec 1-15, 2025
- **Tasks:** 2
  - Complete 10 AI Questions (AI_Questions_tasks, goal: 10)
  - Win 2 One-on-One Matches (1Vs1_tasks, goal: 2)

### 3. Speed Challenge 2025
- **Period:** Oct 1-15, 2025 (Past contest)
- **Tasks:** 3
  - Quick Fire Round (AI_Questions_tasks, goal: 15)
  - Speed Battles (1Vs1_tasks, goal: 4)
  - Master Challenge (AI_Questions_tasks, goal: 30)

## Useful Queries

### Get all contests
```cypher
MATCH (c:Contest)
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
ORDER BY c.startDate
```

### Get contests by date range
```cypher
MATCH (c:Contest)
WHERE datetime(c.startDate) >= datetime($startDate)
  AND datetime(c.endDate) <= datetime($endDate)
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
```

### Get available contests (not started)
```cypher
MATCH (c:Contest)
WHERE datetime(c.startDate) > datetime()
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
```

### Get contest by ID
```cypher
MATCH (c:Contest {contestId: $contestId})
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
```

### Delete all contest data
```cypher
MATCH (c:Contest)
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
DETACH DELETE c, t
```

## Integration with Existing Service

The script creates the database schema that matches the Contest Service implementation:

- **Controller:** `src/contests/contests.controller.ts`
- **Service:** `src/contests/contests.service.ts`
- **DTOs:** `src/contests/dto/`

The service uses these exact node labels and relationship types, so the data structure is fully compatible.

## Verification

After running the script, verify the data:

1. Check the terminal output for success messages
2. Review the contest summary showing all created contests
3. Optionally, connect to Neo4j Browser and run:
   ```cypher
   MATCH (c:Contest)-[:HAS_TASK]->(t:Task)
   RETURN c, t
   ```

## Notes

- The script uses the same Neo4j connection settings as the main `populate-neo4j.js`
- All UUIDs are generated using the `uuid` package
- Dates are in ISO 8601 format
- The script includes comprehensive logging for debugging
- Sample data includes past, present, and future contests for testing
