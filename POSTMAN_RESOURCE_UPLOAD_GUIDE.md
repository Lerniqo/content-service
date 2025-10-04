# 📤 Resource Upload API - Postman Testing Guide

This guide focuses specifically on testing the **POST /resources** endpoint for uploading educational resources to your Content Service.

## 🚀 Quick Setup

### Base Configuration
- **Base URL**: `http://localhost:3000`
- **Endpoint**: `POST /resources`
- **Authentication**: API Gateway headers
- **Roles Required**: `teacher` or `admin`

### Collection Variables in Postman
```
base_url: http://localhost:3000
admin_user_id: admin-123
teacher_user_id: teacher-456
admin_user_name: Admin User
teacher_user_name: Teacher User
```

## 🎯 Resource Upload Examples

### Example 1: Upload Video Resource (Admin)

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: {{admin_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Introduction to Fractions Video",
  "type": "video",
  "description": "A comprehensive video explaining fraction operations",
  "url": "https://example.com/resources/fractions-intro.mp4",
  "isPublic": true,
  "price": 9.99,
  "tags": ["mathematics", "fractions", "elementary"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

**Expected Success Response (201 Created):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "uploadUrl": "https://api-gateway.example.com/upload/550e8400-e29b-41d4-a716-446655440001?timestamp=1728012670583&signature=mock-signature"
}
```

---

### Example 2: Upload Document Resource (Teacher)

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: {{teacher_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Fractions Practice Worksheet",
  "type": "document",
  "description": "Downloadable PDF worksheet for fraction practice",
  "url": "https://example.com/resources/fractions-worksheet.pdf",
  "isPublic": false,
  "price": 2.99,
  "tags": ["mathematics", "fractions", "worksheet", "practice"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

### Example 3: Upload Free Quiz Resource

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: {{teacher_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Basic Fraction Quiz",
  "type": "quiz",
  "description": "Interactive quiz on basic fraction operations",
  "url": "https://example.com/quiz/basic-fractions",
  "isPublic": true,
  "tags": ["mathematics", "fractions", "quiz", "interactive"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

### Example 4: Upload Image Resource

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: {{admin_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440004",
  "name": "Fraction Visual Guide",
  "type": "image",
  "description": "Visual representation of fraction concepts",
  "url": "https://example.com/images/fraction-visual.png",
  "isPublic": true,
  "tags": ["mathematics", "fractions", "visual", "diagram"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

### Example 5: Upload Audio Resource

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: {{teacher_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440005",
  "name": "Fraction Explanation Audio",
  "type": "audio",
  "description": "Audio explanation of fraction multiplication",
  "url": "https://example.com/audio/fraction-explanation.mp3",
  "isPublic": true,
  "price": 1.99,
  "tags": ["mathematics", "fractions", "audio", "explanation"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

## 📋 Resource Types Available

Your API supports these resource types:
- `video` - Video content (MP4, etc.)
- `document` - PDF, Word docs, etc.
- `image` - PNG, JPG, diagrams
- `audio` - MP3, audio explanations
- `interactive` - Interactive content
- `quiz` - Quizzes and assessments
- `assignment` - Homework assignments
- `other` - Other educational content

## 🔐 Authentication Methods

### Option 1: API Gateway Headers (Production)
```
x-user-id: admin-123
x-user-roles: admin
x-user-name: Admin User
```

### Option 2: Development User Header
```
user: {"id": "dev-admin", "role": ["admin"], "username": "dev-admin"}
```

### Option 3: No Headers (Development Default)
In development mode, if no headers are provided, the system uses a default admin user.

## ⚠️ Error Testing Examples

### Example 6: Invalid Resource Type (Should Fail)

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440006",
  "name": "Invalid Resource",
  "type": "invalid-type",
  "url": "https://example.com/resource",
  "isPublic": true,
  "conceptId": "mol001-fractions"
}
```

**Expected:** `400 Bad Request`

---

### Example 7: Missing Required Fields (Should Fail)

**Body:**
```json
{
  "name": "Incomplete Resource"
}
```

**Expected:** `400 Bad Request` with validation errors

---

### Example 8: Non-existent Concept (Should Fail)

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440007",
  "name": "Test Resource",
  "type": "video",
  "url": "https://example.com/test",
  "isPublic": true,
  "conceptId": "non-existent-concept"
}
```

**Expected:** `404 Not Found - Concept not found`

## 📊 Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 201 | Created | Resource uploaded successfully |
| 400 | Bad Request | Invalid input data or validation errors |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Teacher/Admin role required |
| 404 | Not Found | Concept not found |
| 500 | Internal Error | Database or server issue |

## ✅ Success Response Format

```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "uploadUrl": "https://api-gateway.example.com/upload/[resourceId]?timestamp=[timestamp]&signature=[signature]"
}
```

## 🔄 Resource Upload Flow

1. **POST /resources** → Creates resource metadata in Neo4j
2. **Response** → Returns presigned upload URL
3. **Upload File** → Use the presigned URL to upload actual file content
4. **Resource Ready** → File is available at the specified URL

## 🧪 Testing Checklist

- [ ] Create resource with admin role ✅
- [ ] Create resource with teacher role ✅
- [ ] Test all resource types (video, document, image, etc.) ✅
- [ ] Test free resources (no price) ✅
- [ ] Test paid resources (with price) ✅
- [ ] Test public vs private resources ✅
- [ ] Test with valid concept IDs ✅
- [ ] Test error cases (invalid type, missing fields) ❌
- [ ] Test authentication methods ✅
- [ ] Verify presigned URL generation ✅

## 🎯 Quick Test Command

Use this curl command for quick testing:

```bash
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -H "x-user-roles: admin" \
  -H "x-user-name: Admin User" \
  -d '{
    "resourceId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Test Resource",
    "type": "video",
    "url": "https://example.com/test.mp4",
    "isPublic": true,
    "conceptId": "mol001-fractions"
  }'
```

## 📝 Notes

- The `uploadUrl` returned is currently a mock implementation
- In production, this would be a real presigned URL from AWS S3, Google Cloud Storage, etc.
- The `conceptId` must exist in your Neo4j database before creating resources
- Resources are linked to concepts via the EXPLAINS relationship
- User information is stored as `publishedBy` property on the resource

Happy Resource Uploading! 🚀📤