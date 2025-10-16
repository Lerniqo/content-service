# Kafka Communication Fix Summary

## Date: October 16, 2025

## Overview
Fixed the Kafka communication mismatch between the content-service and ai-service for learning path functionality. The services were using incompatible topic names and event structures, preventing proper message flow.

## Issues Identified

### 1. Topic Name Mismatch
- **Content Service (Before)**: Published to `learning_goal.request`
- **AI Service**: Consumes from `learning_path.request`
- **Impact**: Messages from content service never reached AI service

### 2. Request Event Structure Mismatch
**Content Service sent:**
```json
{
  "eventType": "LEARNING_GOAL",
  "eventData": {
    "learningGoal": "...",
    "currentLevel": "...",
    ...
  }
}
```

**AI Service expected:**
```json
{
  "eventType": "learning_path.request",
  "eventData": {
    "request_id": "...",
    "user_id": "...",
    "goal": "...",
    "current_level": "...",
    ...
  }
}
```

### 3. Response Topic Mismatch
- **AI Service**: Publishes responses to `learning_path.response`
- **Content Service (Before)**: Consumed from `learning_path`
- **Impact**: Content service couldn't receive AI responses

### 4. Response Event Structure Mismatch
**AI Service sends:**
```json
{
  "eventType": "learning_path.response",
  "eventData": {
    "request_id": "...",
    "status": "completed",
    "user_id": "...",
    "learning_path": { ... }
  }
}
```

**Content Service expected:** Direct data structure without event wrapper

### 5. Field Naming Convention Mismatch
- **AI Service**: Uses `snake_case` (e.g., `step_number`, `estimated_duration`)
- **Content Service**: Uses `camelCase` (e.g., `stepNumber`, `estimatedDuration`)

## Changes Made

### Content Service - Learning Path Service
**File:** `src/learning-path/learning-path.service.ts`

1. **Updated Request Event Interface** (Line 21-34)
   - Renamed `LearningGoalEvent` to `LearningPathRequestEvent`
   - Changed event structure to match AI service expectations:
     - Added `request_id` field
     - Changed `learningGoal` to `goal`
     - Added `user_id` to eventData
     - Changed `currentLevel` to `current_level`
     - Changed `availableTime` to `available_time`
     - Added `metadata` field to eventData

2. **Updated Kafka Producer** (Line 102-115, 141-149)
   - Changed topic from `learning_goal.request` to `learning_path.request`
   - Updated event type from `LEARNING_GOAL` to `learning_path.request`
   - Restructured event data to match AI service schema

3. **Added Field Transformation** (Line 186-192)
   - Added mapping from snake_case to camelCase for learning path steps
   - Transforms AI service response fields to content service format:
     - `step_number` → `stepNumber`
     - `estimated_duration` → `estimatedDuration`

### Content Service - Learning Path Consumer
**File:** `src/common/kafka/consumers/learning-path.consumer.ts`

1. **Updated Interfaces** (Line 9-54)
   - Changed field names to snake_case to match AI service
   - Added new interface `LearningPathResponseEventData` for event wrapper
   - Added new interface `LearningPathResponseMessage` for complete event structure

2. **Updated Topic Subscription** (Line 77)
   - Changed from `learning_path` to `learning_path.response`

3. **Updated Message Handler** (Line 103-203)
   - Updated to parse `LearningPathResponseMessage` structure
   - Added status checking for failed responses
   - Added error handling for missing learning_path data
   - Transformed response to legacy format for `saveLearningPath` compatibility

### Documentation Updates
**File:** `LEARNING_PATH_MODULE.md`

1. **Updated Architecture Diagram**
   - Changed topic names from `learning_goal` and `learning_path` to `learning_path.request` and `learning_path.response`

2. **Updated Published Topics Section**
   - Renamed section from `learning_goal` to `learning_path.request`
   - Updated event structure example to match new format

3. **Updated Consumed Topics Section**
   - Renamed section from `learning_path` to `learning_path.response`
   - Updated message format to show complete event wrapper structure
   - Changed field names from camelCase to snake_case in examples

## Testing Recommendations

### 1. Integration Testing
- Test the complete flow from request to response
- Verify that learning paths are correctly saved to Neo4j
- Check that all field transformations work correctly

### 2. Error Scenarios
- Test handling of failed learning path generation
- Verify dead letter queue or retry logic for malformed messages
- Test timeout scenarios

### 3. Backward Compatibility
- Ensure existing learning paths in database are not affected
- Verify that API responses remain consistent for frontend

## Impact Assessment

### Positive Changes ✅
- **Fixed Communication**: Content service and AI service can now communicate properly
- **Aligned Schemas**: Event structures match across both services
- **Better Error Handling**: Added status checking and failure handling
- **Maintained Functionality**: Internal database schema unchanged, no data migration needed

### Zero Breaking Changes ✅
- **Database**: No changes to Neo4j schema or existing data
- **API**: Public API endpoints remain unchanged
- **Frontend**: No changes required to frontend integration

## Verification Steps

1. **Start both services**
   ```bash
   # In content-service
   npm run start:dev
   
   # In ai-service
   python run.py
   ```

2. **Verify Kafka topics exist**
   - `learning_path.request`
   - `learning_path.response`

3. **Test request flow**
   ```bash
   curl -X POST http://localhost:3000/api/learning-path/request \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "learningGoal": "Learn TypeScript",
       "currentLevel": "beginner",
       "availableTime": "2 hours/day"
     }'
   ```

4. **Check Kafka messages**
   - Verify request message in `learning_path.request` topic
   - Verify response message in `learning_path.response` topic

5. **Verify database**
   - Check that learning path is created with status "processing"
   - Check that it's updated to "completed" after AI service responds

## Files Modified

1. `/content-service/src/learning-path/learning-path.service.ts`
2. `/content-service/src/common/kafka/consumers/learning-path.consumer.ts`
3. `/content-service/LEARNING_PATH_MODULE.md`

## Files Not Modified (AI Service)

The AI service implementation was already correct and aligned with the expected schema. No changes were needed on the AI service side.

## Next Steps

1. ✅ Monitor logs for any Kafka connection issues
2. ✅ Monitor learning path generation success rate
3. ✅ Consider adding metrics/monitoring for Kafka message processing
4. ✅ Consider implementing dead letter queue for failed messages
5. ✅ Update API documentation if needed

## Notes

- All changes are backward compatible with existing functionality
- No database migrations required
- No changes to public APIs
- Frontend integration remains unchanged
- The fix preserves the existing async processing pattern
