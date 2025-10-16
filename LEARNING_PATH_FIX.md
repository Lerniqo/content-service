# Learning Path Error Fix

## Problem
The `/learning-path` GET endpoint was returning a 500 Internal Server Error with the message "Failed to fetch learning path".

## Root Cause
The error occurred because the Cypher queries in `learning-path.service.ts` were using `MATCH (u:User {id: $userId})` to find the User node. When a user that didn't exist in the Neo4j database tried to access their learning path, the `MATCH` clause would fail since it requires the node to exist, causing the query to fail and throw an Internal Server Error.

## Solution
Changed all Cypher queries in `learning-path.service.ts` to use `MERGE` instead of `MATCH` for User nodes. This ensures that:

1. If the User node exists, it will be found and used
2. If the User node doesn't exist, it will be created automatically
3. The query will never fail due to a missing User node

### Changes Made

#### 1. `getLearningPathByUserId` method
**Before:**
```cypher
MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
```

**After:**
```cypher
// Find or create the user
MERGE (u:User {id: $userId})
ON CREATE SET u.createdAt = $timestamp

// Try to find the learning path
OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(lp:LearningPath)
```

Also added check for null learning path:
```typescript
if (!result || result.length === 0 || !result[0].id) {
  throw new NotFoundException('Learning path not found');
}
```

#### 2. `getUserLearningPaths` method
**Before:**
```cypher
MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
```

**After:**
```cypher
// Find or create the user
MERGE (u:User {id: $userId})
ON CREATE SET u.createdAt = $timestamp

// Try to find learning paths
OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(lp:LearningPath)
```

Also added filtering for null results:
```typescript
return result
  .filter((record: any) => record.id !== null)
  .map((record: any) => { ... });
```

#### 3. `requestLearningPath` method
**Before:**
```cypher
MATCH (u:User {id: $userId})
```

**After:**
```cypher
// Find or create the user
MERGE (u:User {id: $userId})
ON CREATE SET u.createdAt = $timestamp
```

#### 4. `createLearningPath` method
**Before:**
```cypher
MATCH (u:User {id: $userId})
```

**After:**
```cypher
// Find or create the user
MERGE (u:User {id: $userId})
ON CREATE SET u.createdAt = $timestamp
```

## Benefits

1. **Robust User Handling**: Users are automatically created if they don't exist
2. **No More 500 Errors**: The endpoint will now return a proper 404 Not Found when a learning path doesn't exist, instead of a 500 error
3. **Better User Experience**: New users can access the endpoint without pre-creating their User node
4. **Consistent Behavior**: All learning path methods now handle user creation consistently

## Testing

To verify the fix works:

1. Call `GET /learning-path` with a user ID that doesn't exist in Neo4j
   - Expected: 404 Not Found with message "Learning path not found"
   - Previously: 500 Internal Server Error with message "Failed to fetch learning path"

2. Create a learning path using `POST /learning-path/request` or `POST /learning-path/create`
   - Expected: Success even if user doesn't exist in database
   - User node will be created automatically

3. Call `GET /learning-path` again
   - Expected: 200 OK with the learning path data (if created) or 404 if still not created

## Additional Notes

- The fix maintains backward compatibility
- Existing User nodes are not affected
- The `saveLearningPath` method already used `MERGE`, so it was not modified
- Added timestamp parameter to support the `ON CREATE SET u.createdAt = $timestamp` clause
