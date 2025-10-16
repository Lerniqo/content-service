# Contest Schema for Neo4j

## Overview
This document describes the Neo4j schema for the Contests feature, including node types, relationship types, properties, and indexes.

## Node Types

### 1. Contest Node
Represents a competitive event that students can participate in.

**Label:** `Contest`

**Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| contestId | String | Yes | Unique identifier for the contest (UUID) |
| contestName | String | Yes | Name of the contest |
| subTitle | String | No | Optional subtitle or description |
| startDate | DateTime | Yes | When the contest starts (ISO 8601) |
| endDate | DateTime | Yes | When the contest ends (ISO 8601) |
| createdAt | DateTime | Yes | When the contest was created |
| updatedAt | DateTime | Yes | When the contest was last updated |

**Constraints:**
- `contestId` must be unique

**Indexes:**
- `contestId` (for fast lookups)
- `contestName` (for searching by name)
- `startDate` (for filtering by date)
- `endDate` (for filtering by date)

**Example:**
```cypher
CREATE (c:Contest {
  contestId: "123e4567-e89b-12d3-a456-426614174000",
  contestName: "Mathematics Championship 2025",
  subTitle: "Test your mathematics skills",
  startDate: "2025-11-01T00:00:00Z",
  endDate: "2025-11-30T23:59:59Z",
  createdAt: "2025-10-16T10:00:00Z",
  updatedAt: "2025-10-16T10:00:00Z"
})
```

---

### 2. Task Node
Represents a task within a contest that participants must complete.

**Label:** `Task`

**Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| taskId | String | Yes | Unique identifier for the task (UUID) |
| title | String | Yes | Title of the task |
| type | String | Yes | Type of task: `1Vs1_tasks` or `AI_Questions_tasks` |
| description | String | Yes | Detailed description of the task |
| goal | Integer | Yes | Number of times the task needs to be completed |

**Task Types:**
- `1Vs1_tasks`: One-on-one battle tasks
- `AI_Questions_tasks`: AI-generated question tasks

**Constraints:**
- `taskId` must be unique

**Indexes:**
- `taskId` (for fast lookups)
- `type` (for filtering by task type)

**Example:**
```cypher
CREATE (t:Task {
  taskId: "456e7890-e89b-12d3-a456-426614174000",
  title: "Complete 5 One-on-One Battles",
  type: "1Vs1_tasks",
  description: "Win 5 one-on-one battles to complete this task",
  goal: 5
})
```

---

### 3. ContestParticipation Node (Optional)
Tracks user participation in contests. This is an optional node that can be used to store participation metadata.

**Label:** `ContestParticipation`

**Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| userId | String | Yes | ID of the participating user |
| contestId | String | Yes | ID of the contest |
| status | String | Yes | Participation status: `registered`, `in_progress`, or `completed` |
| joinedAt | DateTime | Yes | When the user joined the contest |
| score | Integer | No | User's score in the contest |

**Indexes:**
- `userId` (for finding user's contests)
- `status` (for filtering by participation status)

**Example:**
```cypher
CREATE (p:ContestParticipation {
  userId: "user-123",
  contestId: "contest-456",
  status: "in_progress",
  joinedAt: "2025-11-01T10:30:00Z",
  score: 0
})
```

---

## Relationship Types

### 1. HAS_TASK
Links a contest to its tasks.

**Type:** `HAS_TASK`

**Direction:** `(Contest)-[:HAS_TASK]->(Task)`

**Properties:** None

**Cardinality:** One-to-Many (a contest has 1-5 tasks)

**Example:**
```cypher
MATCH (c:Contest {contestId: "contest-123"})
MATCH (t:Task {taskId: "task-456"})
CREATE (c)-[:HAS_TASK]->(t)
```

**Query Example:**
```cypher
// Get all tasks for a contest
MATCH (c:Contest {contestId: $contestId})-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
```

---

### 2. PARTICIPATES_IN
Links a user to contests they're participating in.

**Type:** `PARTICIPATES_IN`

**Direction:** `(User)-[:PARTICIPATES_IN]->(Contest)`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| joinedAt | DateTime | When the user joined |
| status | String | `registered`, `in_progress`, or `completed` |

**Cardinality:** Many-to-Many (users can participate in multiple contests)

**Example:**
```cypher
MATCH (u:User {id: "user-123"})
MATCH (c:Contest {contestId: "contest-456"})
CREATE (u)-[:PARTICIPATES_IN {
  joinedAt: datetime(),
  status: "registered"
}]->(c)
```

**Query Example:**
```cypher
// Get all contests a user is participating in
MATCH (u:User {id: $userId})-[p:PARTICIPATES_IN]->(c:Contest)
WHERE p.status = 'in_progress'
RETURN c, p.joinedAt
ORDER BY c.startDate
```

---

### 3. COMPLETED_TASK
Tracks when a user completes a task within a contest.

**Type:** `COMPLETED_TASK`

**Direction:** `(User)-[:COMPLETED_TASK]->(Task)`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| completedAt | DateTime | When the task was completed |
| progress | Integer | Current progress toward goal |
| contestId | String | ID of the contest this completion is for |

**Cardinality:** Many-to-Many (users can complete multiple tasks)

**Example:**
```cypher
MATCH (u:User {id: "user-123"})
MATCH (t:Task {taskId: "task-456"})
CREATE (u)-[:COMPLETED_TASK {
  completedAt: datetime(),
  progress: 3,
  contestId: "contest-789"
}]->(t)
```

**Query Example:**
```cypher
// Get user's progress on all tasks in a contest
MATCH (u:User {id: $userId})-[ct:COMPLETED_TASK]->(t:Task)
MATCH (c:Contest {contestId: $contestId})-[:HAS_TASK]->(t)
WHERE ct.contestId = $contestId
RETURN t, ct.progress, ct.completedAt
```

---

## Common Query Patterns

### Get All Contests with Tasks
```cypher
MATCH (c:Contest)
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c.contestId, c.contestName, c.startDate, c.endDate,
       collect({
         taskId: t.taskId,
         title: t.title,
         type: t.type,
         description: t.description,
         goal: t.goal
       }) AS tasks
ORDER BY c.startDate DESC
```

### Get Available Contests (Not Started Yet)
```cypher
MATCH (c:Contest)
WHERE datetime(c.startDate) > datetime()
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
ORDER BY c.startDate
```

### Get Active Contests (In Progress)
```cypher
MATCH (c:Contest)
WHERE datetime(c.startDate) <= datetime() AND datetime(c.endDate) >= datetime()
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
RETURN c, collect(t) AS tasks
ORDER BY c.startDate
```

### Check if User Can Participate
```cypher
MATCH (c:Contest {contestId: $contestId})
WHERE datetime(c.startDate) > datetime()
RETURN true AS canParticipate
UNION
MATCH (c:Contest {contestId: $contestId})
WHERE datetime(c.startDate) <= datetime()
RETURN false AS canParticipate
```

### Get User's Contest Progress
```cypher
MATCH (u:User {id: $userId})-[p:PARTICIPATES_IN]->(c:Contest {contestId: $contestId})
MATCH (c)-[:HAS_TASK]->(t:Task)
OPTIONAL MATCH (u)-[ct:COMPLETED_TASK]->(t)
WHERE ct.contestId = $contestId
RETURN c, t, 
       COALESCE(ct.progress, 0) AS progress,
       t.goal AS goal,
       CASE WHEN ct.progress >= t.goal THEN true ELSE false END AS completed
```

### Update Contest
```cypher
MATCH (c:Contest {contestId: $contestId})
SET c.contestName = $contestName,
    c.subTitle = $subTitle,
    c.startDate = $startDate,
    c.endDate = $endDate,
    c.updatedAt = datetime()
RETURN c
```

### Delete Contest and Tasks
```cypher
MATCH (c:Contest {contestId: $contestId})
OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
DETACH DELETE c, t
```

---

## Schema Validation Rules

1. **Contest Dates:**
   - `startDate` must be before `endDate`
   - Both dates must be in ISO 8601 format

2. **Tasks:**
   - Each contest must have between 1 and 5 tasks
   - Task `goal` must be at least 1
   - Task `type` must be either `1Vs1_tasks` or `AI_Questions_tasks`

3. **Participation:**
   - Users can only participate in contests before the `startDate`
   - Once a contest starts, new participants cannot join

4. **Task Completion:**
   - Progress must be tracked per user per task
   - When progress reaches or exceeds the goal, the task is considered completed

---

## Running the Population Script

To populate the Neo4j database with the contest schema and sample data:

```bash
node PopulatingDB/populate-contests.js
```

This script will:
1. Create all necessary indexes and constraints
2. Populate sample contest data (3 contests with tasks)
3. Verify the created data
4. Display a summary of the schema

---

## Sample Data Included

The population script creates three sample contests:

1. **Mathematics Championship 2025**
   - Start: November 1, 2025
   - End: November 30, 2025
   - Tasks: 3 (Mix of 1Vs1 and AI Questions)

2. **Science Quiz Challenge**
   - Start: December 1, 2025
   - End: December 15, 2025
   - Tasks: 2 (Mix of types)

3. **Speed Challenge 2025** (Past Contest)
   - Start: October 1, 2025
   - End: October 15, 2025
   - Tasks: 3 (For testing past contests)

---

## Integration with Content Service

The Contest schema integrates with:
- **User nodes**: For tracking participation and progress
- **Question nodes**: For AI_Questions_tasks
- **Battle/Quiz nodes**: For 1Vs1_tasks

Future enhancements could include:
- Leaderboards (add rank tracking)
- Rewards (link to reward/badge nodes)
- Team contests (add Team nodes)
- Contest categories (add Category nodes)
