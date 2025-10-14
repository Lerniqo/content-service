# Content Service API Documentation

## Overview
This is a comprehensive guide to all API endpoints in the Content Service. The service handles educational content management including resources, quizzes, questions, concepts, and syllabus.

## Base URL
```
http://localhost:4001
```

## Authentication
The service uses API Gateway pattern for authentication. For endpoints requiring authentication, include these headers:

### Required Headers (for authenticated endpoints)
```json
{
  "x-user-id": "user-123",
  "x-user-roles": "admin,teacher"
}
```

### Optional Headers (for development/testing)
```json
{
  "user": "{\"id\":\"test-user-123\",\"role\":[\"admin\",\"teacher\"]}"
}
```

## Content-Type
All POST/PUT requests should include:
```json
{
  "Content-Type": "application/json"
}
```

---

## 🏥 Health Check Endpoints

### GET /api/health
**Purpose:** Check service health status  
**Authentication:** None required  
**Method:** GET  

#### Response
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

---

## 📚 Syllabus Endpoints

### GET /api/content/syllabus
**Purpose:** Get complete syllabus tree structure  
**Authentication:** None required (Public endpoint)  
**Method:** GET  

#### Response
```json
{
  "syllabus": [
    {
      "conceptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Ordinary Level Mathematics (OLM001)",
      "type": "Subject",
      "description": "Core mathematics curriculum for ordinary level",
      "children": [
        {
          "conceptId": "child-concept-id",
          "name": "Algebra",
          "type": "Matter",
          "description": "Algebraic concepts",
          "children": []
        }
      ],
      "createdAt": "2024-10-04T10:30:00Z"
    }
  ],
  "totalConcepts": 150,
  "retrievedAt": "2024-10-04T10:30:00Z"
}
```

---

## 🧠 Concepts Endpoints

### GET /api/content/concepts/:id
**Purpose:** Get specific concept with prerequisites and learning resources  
**Authentication:** None required (Public endpoint)  
**Method:** GET  

#### Parameters
- `id` (path): Concept ID

#### Response
```json
{
  "conceptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Multiplication of Fractions (ATM001)",
  "type": "Atom",
  "description": "Learn how to multiply fractions step by step",
  "prerequisites": [
    {
      "conceptId": "abc123-def456-ghi789",
      "name": "Basic Addition (ATM001)",
      "type": "Atom",
      "description": "Fundamental addition operations"
    }
  ],
  "learningResources": [
    {
      "resourceId": "res123-456-789",
      "name": "Fractions Video Tutorial",
      "type": "video",
      "description": "A comprehensive video tutorial on fractions",
      "url": "https://example.com/resources/fractions-video",
      "isPublic": true,
      "price": 9.99
    }
  ],
  "createdAt": "2024-10-04T10:30:00Z"
}
```

---

## 📖 Resources Endpoints

### POST /api/content/resources
**Purpose:** Create a new learning resource  
**Authentication:** Required (Teacher/Admin roles)  
**Method:** POST  

#### Headers
```json
{
  "Content-Type": "application/json",
  "x-user-id": "user-123",
  "x-user-roles": "teacher,admin"
}
```

#### Request Body
```json
{
  "resourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Advanced Calculus Tutorial",
  "type": "video",
  "description": "Comprehensive calculus tutorial covering derivatives and integrals",
  "url": "https://example.com/calculus-tutorial",
  "conceptId": "concept-calculus-001",
  "isPublic": true,
  "price": 29.99,
  "tags": ["mathematics", "calculus", "derivatives"],
  "gradeLevel": "Grade 12",
  "subject": "Advanced Mathematics"
}
```

#### Response
```json
{
  "resourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "uploadUrl": "https://api-gateway.example.com/upload/abc123?signature=xyz789"
}
```

### PUT /api/content/resources/:id
**Purpose:** Update an existing resource  
**Authentication:** Required (Teacher/Admin roles)  
**Method:** PUT  

#### Headers
```json
{
  "Content-Type": "application/json",
  "x-user-id": "user-123",
  "x-user-roles": "teacher,admin"
}
```

#### Parameters
- `id` (path): Resource ID

#### Request Body
```json
{
  "name": "Updated Calculus Tutorial",
  "description": "Updated comprehensive calculus tutorial",
  "url": "https://example.com/updated-calculus-tutorial",
  "isPublic": false,
  "price": 34.99,
  "tags": ["mathematics", "calculus", "advanced"],
  "gradeLevel": "Grade 12",
  "subject": "Advanced Mathematics"
}
```

#### Response
```json
{
  "resourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Updated Calculus Tutorial",
  "type": "video",
  "description": "Updated comprehensive calculus tutorial",
  "url": "https://example.com/updated-calculus-tutorial",
  "isPublic": false,
  "price": 34.99,
  "tags": ["mathematics", "calculus", "advanced"],
  "gradeLevel": "Grade 12",
  "subject": "Advanced Mathematics",
  "publishedBy": "user-123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-16T14:45:00Z"
}
```

### DELETE /api/content/resources/:id
**Purpose:** Delete an existing resource  
**Authentication:** Required (Teacher/Admin roles)  
**Method:** DELETE  

#### Headers
```json
{
  "x-user-id": "user-123",
  "x-user-roles": "teacher,admin"
}
```

#### Parameters
- `id` (path): Resource ID

#### Response
```json
{
  "resourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Resource deleted successfully",
  "deletedAt": "2024-10-04T10:30:00Z"
}
```

---

## ❓ Questions Endpoints

### POST /api/content/questions
**Purpose:** Create a new question  
**Authentication:** Required (Admin role only)  
**Method:** POST  

#### Headers
```json
{
  "Content-Type": "application/json",
  "x-user-id": "user-123",
  "x-user-roles": "admin"
}
```

#### Request Body
```json
{
  "id": "question-001",
  "questionText": "What is the derivative of x²?",
  "options": ["2x", "x", "x²", "2"],
  "correctAnswer": "2x",
  "explanation": "The derivative of x² is 2x using the power rule",
  "tags": ["calculus", "derivatives", "mathematics"],
  "difficulty": "medium",
  "points": 10
}
```

#### Response
```json
{
  "id": "question-001",
  "message": "Question created successfully"
}
```

---

## 📝 Quizzes Endpoints

### POST /api/content/quizzes
**Purpose:** Create a new quiz  
**Authentication:** Required (Teacher/Admin roles)  
**Method:** POST  

#### Headers
```json
{
  "Content-Type": "application/json",
  "x-user-id": "user-123",
  "x-user-roles": "teacher,admin"
}
```

#### Request Body
```json
{
  "title": "Calculus Basics Quiz",
  "description": "Test your understanding of basic calculus concepts",
  "conceptId": "concept-calculus-001",
  "questionIds": ["question-001", "question-002", "question-003"],
  "timeLimit": 3600,
  "passingScore": 70,
  "isPublic": true
}
```

#### Response
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Calculus Basics Quiz",
  "description": "Test your understanding of basic calculus concepts",
  "timeLimit": 3600,
  "conceptId": "concept-calculus-001",
  "questionIds": ["question-001", "question-002", "question-003"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### GET /api/content/quizzes/:id
**Purpose:** Get quiz by ID with all questions  
**Authentication:** Required (Student/Teacher/Admin roles)  
**Method:** GET  

#### Headers
```json
{
  "x-user-id": "user-123",
  "x-user-roles": "student,teacher,admin"
}
```

#### Parameters
- `id` (path): Quiz ID

#### Response
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Calculus Basics Quiz",
  "description": "Test your understanding of basic calculus concepts",
  "timeLimit": 3600,
  "questions": [
    {
      "id": "question-001",
      "questionText": "What is the derivative of x²?",
      "options": ["2x", "x", "x²", "2"],
      "correctAnswer": "2x",
      "explanation": "The derivative of x² is 2x using the power rule",
      "tags": ["calculus", "derivatives", "mathematics"]
    }
  ],
  "createdAt": "2024-10-04T10:30:00Z",
  "updatedAt": "2024-10-04T10:30:00Z"
}
```

---

## 📊 Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Name is required", "Type must be a valid resource type"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Access denied. Required roles: admin. User roles: student",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource with ID abc123 not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Question with ID question-001 already exists",
  "error": "Conflict"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 🔐 Role-Based Access Control

| Endpoint | Public | Student | Teacher | Admin |
|----------|--------|---------|---------|-------|
| `GET /api/health` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/content/syllabus` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/content/concepts/:id` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/content/resources` | ❌ | ❌ | ✅ | ✅ |
| `PUT /api/content/resources/:id` | ❌ | ❌ | ✅* | ✅ |
| `DELETE /api/content/resources/:id` | ❌ | ❌ | ✅* | ✅ |
| `POST /api/content/questions` | ❌ | ❌ | ❌ | ✅ |
| `POST /api/content/quizzes` | ❌ | ❌ | ✅ | ✅ |
| `GET /api/content/quizzes/:id` | ❌ | ✅ | ✅ | ✅ |

*Teachers can only modify resources they created

---

## 🧪 Testing Examples

### Creating a Resource (cURL)
```bash
curl -X POST http://localhost:4001/api/content/resources \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-user-roles: teacher" \
  -d '{
    "resourceId": "res-001",
    "name": "Math Tutorial",
    "type": "video",
    "description": "Basic math concepts",
    "url": "https://example.com/math-tutorial",
    "conceptId": "concept-001",
    "isPublic": true,
    "price": 0,
    "tags": ["math", "basic"],
    "gradeLevel": "Grade 8",
    "subject": "Mathematics"
  }'
```

### Getting a Quiz (cURL)
```bash
curl -X GET http://localhost:4001/api/content/quizzes/quiz-001 \
  -H "x-user-id: student-123" \
  -H "x-user-roles: student"
```

### Development Testing (No API Gateway)
```bash
curl -X POST http://localhost:4001/api/content/resources \
  -H "Content-Type: application/json" \
  -H "user: {\"id\":\"dev-user\",\"role\":[\"admin\"]}" \
  -d '{
    "resourceId": "res-dev-001",
    "name": "Dev Test Resource",
    "type": "document",
    "description": "Development test",
    "url": "https://example.com/dev-resource",
    "conceptId": "concept-001",
    "isPublic": true,
    "price": 0
  }'
```

---

## 📝 Notes

1. **Authentication**: All authenticated endpoints require either `x-user-id` and `x-user-roles` headers (production) or a `user` header (development).

2. **Public Endpoints**: `/api/health`, `/api/content/syllabus`, and `/api/content/concepts/:id` are publicly accessible.

3. **Role Hierarchy**: Admin users can perform all operations. Teachers can create/modify their own content. Students can only read content.

4. **Error Handling**: All endpoints return structured error responses with appropriate HTTP status codes.

5. **Development Mode**: When running in development mode, the service provides default mock user credentials if no authentication headers are provided.