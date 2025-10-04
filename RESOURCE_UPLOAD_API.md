# 📤 Resource Upload API - Complete Guide

This API focuses **exclusively on resource uploading** functionality. Upload educational resources (videos, documents, quizzes, etc.) to your Content Service.

## 🚀 Quick Start

### Base Configuration
- **Base URL**: `http://localhost:3000`
- **Main Endpoint**: `POST /resources`
- **Authentication**: API Gateway headers
- **Required Roles**: `teacher` or `admin`

### Available Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Hello World | No |
| GET | `/health` | Health check | No |
| **POST** | **`/resources`** | **Upload resource** | **Yes (teacher/admin)** |

## 📤 Resource Upload Examples

### Example 1: Upload Video Resource

**Method:** `POST`  
**URL:** `http://localhost:3000/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: admin-123
x-user-roles: admin
x-user-name: Admin User
```

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Introduction to Fractions Video",
  "type": "video",
  "description": "A comprehensive video explaining fraction operations",
  "url": "https://example.com/videos/fractions-intro.mp4",
  "isPublic": true,
  "price": 9.99,
  "tags": ["mathematics", "fractions", "elementary"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

**Success Response (201):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "uploadUrl": "https://api-gateway.example.com/upload/550e8400-e29b-41d4-a716-446655440001?timestamp=1728012670583&signature=mock-signature"
}
```

---

### Example 2: Upload Document Resource (Teacher)

**Headers:**
```
Content-Type: application/json
x-user-id: teacher-456
x-user-roles: teacher
x-user-name: Teacher User
```

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Fractions Practice Worksheet",
  "type": "document",
  "description": "Downloadable PDF worksheet for fraction practice",
  "url": "https://example.com/docs/fractions-worksheet.pdf",
  "isPublic": false,
  "price": 2.99,
  "tags": ["mathematics", "fractions", "worksheet"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

### Example 3: Upload Free Quiz Resource

**Body:**
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
*(No price = free resource)*

---

### Example 4: Upload Audio Resource

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440004",
  "name": "Fraction Explanation Audio",
  "type": "audio",
  "description": "Audio explanation of fraction multiplication",
  "url": "https://example.com/audio/fraction-explanation.mp3",
  "isPublic": true,
  "price": 1.99,
  "tags": ["mathematics", "fractions", "audio"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

### Example 5: Upload Image Resource

**Body:**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440005",
  "name": "Fraction Visual Guide",
  "type": "image",
  "description": "Visual diagrams showing fraction concepts",
  "url": "https://example.com/images/fraction-diagram.png",
  "isPublic": true,
  "tags": ["mathematics", "fractions", "visual", "diagram"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

## 📋 Supported Resource Types

| Type | Description | Examples |
|------|-------------|----------|
| `video` | Video content | MP4, YouTube links, educational videos |
| `document` | Text documents | PDF, Word docs, slides |
| `image` | Images/diagrams | PNG, JPG, charts, diagrams |
| `audio` | Audio content | MP3, podcasts, explanations |
| `interactive` | Interactive content | Simulations, games |
| `quiz` | Quizzes/tests | Online quizzes, assessments |
| `assignment` | Homework | Assignment sheets, projects |
| `other` | Other content | Any other educational material |

## 🔐 Authentication Options

### Option 1: API Gateway Headers (Recommended)
```
x-user-id: admin-123
x-user-roles: admin
x-user-name: Admin User
```

### Option 2: Development User Header
```
user: {"id": "dev-admin", "role": ["admin"], "username": "dev-admin"}
```

### Option 3: No Headers (Development Mode)
In development, the system uses a default admin user if no headers are provided.

## ⚠️ Error Examples

### Invalid Resource Type
**Request:**
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
**Response:** `400 Bad Request`

### Missing Required Fields
**Request:**
```json
{
  "name": "Incomplete Resource"
}
```
**Response:** `400 Bad Request` with validation errors

### Non-existent Concept
**Request:**
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
**Response:** `404 Not Found - Concept not found`

## 📊 Response Codes

| Code | Status | When |
|------|--------|------|
| 201 | Created | Resource uploaded successfully |
| 400 | Bad Request | Invalid input/validation errors |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Teacher/Admin role required |
| 404 | Not Found | Concept not found |
| 500 | Internal Error | Server/database error |

## ✅ Required Fields

**Mandatory:**
- `resourceId` - UUID for the resource
- `name` - Resource name
- `type` - Must be one of the supported types
- `url` - Where the resource content is located
- `isPublic` - Whether resource is publicly accessible
- `conceptId` - Must exist in the database

**Optional:**
- `description` - Resource description
- `price` - Price (omit for free resources)
- `tags` - Array of tags
- `gradeLevel` - Grade level (e.g., "Grade 8")
- `subject` - Subject area (e.g., "Mathematics")
- `createdAt` - Creation date (auto-generated if omitted)

## 🔄 Upload Flow

1. **POST /resources** → Creates resource metadata in database
2. **Response** → Returns resource ID + presigned upload URL  
3. **Upload File** → Use presigned URL to upload actual content
4. **Resource Ready** → File available at specified URL

## 🧪 Quick Test Commands

**PowerShell/CMD:**
```bash
curl -X POST http://localhost:3000/resources ^
  -H "Content-Type: application/json" ^
  -H "x-user-id: admin-123" ^
  -H "x-user-roles: admin" ^
  -d "{\"resourceId\":\"550e8400-e29b-41d4-a716-446655440001\",\"name\":\"Test Resource\",\"type\":\"video\",\"url\":\"https://example.com/test.mp4\",\"isPublic\":true,\"conceptId\":\"mol001-fractions\"}"
```

**Bash:**
```bash
curl -X POST http://localhost:3000/resources \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -H "x-user-roles: admin" \
  -d '{"resourceId":"550e8400-e29b-41d4-a716-446655440001","name":"Test Resource","type":"video","url":"https://example.com/test.mp4","isPublic":true,"conceptId":"mol001-fractions"}'
```

## 📝 Important Notes

- **Concepts**: The `conceptId` must exist in your Neo4j database before creating resources
- **Upload URL**: Currently returns a mock URL; replace with real cloud storage integration
- **User Tracking**: User info stored as `publishedBy` property on resource nodes
- **Relationships**: Resources are linked to concepts via `EXPLAINS` relationship
- **Pricing**: Omit `price` field for free resources

## 🎯 Testing Checklist

- [ ] Upload video resource ✅
- [ ] Upload document resource ✅  
- [ ] Upload free resource (no price) ✅
- [ ] Upload paid resource (with price) ✅
- [ ] Test with admin role ✅
- [ ] Test with teacher role ✅
- [ ] Test all resource types ✅
- [ ] Test error cases ❌
- [ ] Verify presigned URL generation ✅

Happy Resource Uploading! 🚀📤