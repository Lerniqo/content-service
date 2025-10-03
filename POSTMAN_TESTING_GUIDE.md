# Postman API Testing Guide for Content Service - API Gateway Integration

This guide will help you set up and test all available API endpoints in your NestJS Content Service using Postman with API Gateway authentication.

## 🚀 Quick Setup

### 1. Base URL Configuration
- **Base URL**: `http://localhost:3000`
- **Port**: 3000 (as configured in your .env file)

### 2. Available Endpoints

Your Content Service has the following endpoints:

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | Hello World | No | - |
| GET | `/health` | Health check | No | - |
| POST | `/concepts` | Create concept | Yes | admin |
| PUT | `/concepts/:id` | Update concept | Yes | admin |
| POST | `/concepts/:id/prerequisites` | Create prerequisite | Yes | admin |
| POST | `/resources` | Create resource | Yes | teacher, admin |

## 🔐 API Gateway Authentication

Your service is designed to work with an API Gateway that handles authentication and passes user information through headers.

### Authentication Headers (from API Gateway):
```
x-user-id: <USER_ID>
x-user-roles: <COMMA_SEPARATED_ROLES>
x-user-name: <USER_NAME>
Content-Type: application/json
```

### Development Testing Headers:
For development/testing, you can also use the direct user header:
```
user: {"id": "user-123", "role": ["admin"], "username": "test-user"}
Content-Type: application/json
```

## 📋 Postman Collection Setup

### Step 1: Create a New Collection
1. Open Postman
2. Click "New" → "Collection"
3. Name it "Content Service API - API Gateway"

### Step 2: Set Collection Variables
1. Right-click your collection → "Edit"
2. Go to "Variables" tab
3. Add these variables:
   - `base_url`: `http://localhost:3000`
   - `admin_user_id`: `admin-123`
   - `admin_user_roles`: `admin`
   - `admin_user_name`: `Admin User`
   - `teacher_user_id`: `teacher-456`
   - `teacher_user_roles`: `teacher`
   - `teacher_user_name`: `Teacher User`

### Step 3: No Collection Authorization Needed
Since authentication is handled via headers (not Bearer tokens), you don't need to set collection-level authorization.

## 🧪 Testing Each Endpoint

### 1. Health Check (No Auth Required)

**Request:**
```
GET {{base_url}}/health
```

**Expected Response:**
```json
"Service is healthy"
```

### 2. Hello World (No Auth Required)

**Request:**
```
GET {{base_url}}/
```

**Expected Response:**
```json
"Hello World!"
```

### 3. Create Concept (Admin Only)

**Request:**
```
POST {{base_url}}/concepts
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: {{admin_user_roles}}
x-user-name: {{admin_user_name}}
```

**Body (JSON):**
```json
{
  "conceptId": "concept-math-001",
  "name": "Basic Mathematics",
  "type": "Subject",
  "description": "Core mathematics curriculum for ordinary level",
  "parentId": "concept-root"
}
```

**Available Concept Types:**
- Subject
- Matter
- Molecule  
- Atom
- Particle

### 4. Update Concept (Admin Only)

**Request:**
```
PUT {{base_url}}/concepts/concept-math-001
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: {{admin_user_roles}}
x-user-name: {{admin_user_name}}
```

**Body (JSON):**
```json
{
  "name": "Advanced Mathematics",
  "type": "Subject",
  "description": "Updated description of advanced mathematics"
}
```

### 5. Create Prerequisite Relationship (Admin Only)

**Request:**
```
POST {{base_url}}/concepts/concept-math-001/prerequisites
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: {{admin_user_roles}}
x-user-name: {{admin_user_name}}
```

**Body (JSON):**
```json
{
  "prerequisiteId": "concept-basic-001"
}
```

### 6. Create Resource (Teacher/Admin)

**Request:**
```
POST {{base_url}}/resources
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: {{teacher_user_roles}}
x-user-name: {{teacher_user_name}}
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Introduction to Fractions Video",
  "type": "video",
  "description": "A comprehensive video explaining fraction operations",
  "url": "https://example.com/resources/fractions-intro",
  "isPublic": true,
  "price": 9.99,
  "tags": ["mathematics", "fractions", "elementary"],
  "conceptId": "concept-math-001",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

**Available Resource Types:**
- video
- document  
- image
- audio
- interactive
- quiz
- assignment
- other

## 🔑 Authentication Methods

### Option 1: API Gateway Headers (Production Pattern)
Use the standard API Gateway headers that your service expects in production:
```
x-user-id: admin-123
x-user-roles: admin
x-user-name: Admin User
```

### Option 2: Direct User Header (Development Testing)
For development and testing, you can use the direct user header:
```
user: {"id": "dev-admin-123", "role": ["admin"], "username": "dev-admin"}
```

### Option 3: No Headers (Default Development User)
In development mode, if no headers are provided, the service will use a default admin user automatically.

## 🧪 Test Scenarios

### Scenario 1: Create Complete Learning Path
1. Create a Subject concept
2. Create Chapter concepts with Subject as parent
3. Create Topic concepts with Chapter as parent
4. Create resources for each topic
5. Set up prerequisites between concepts

### Scenario 2: Test Authorization
1. Try admin endpoints with admin headers ✅
2. Try admin endpoints with teacher headers ❌ (should fail)
3. Try resource creation with teacher headers ✅
4. Try concept creation with no auth headers ✅ (uses default admin in dev)

### Scenario 3: Error Handling
1. Send invalid JSON
2. Send missing required fields
3. Send invalid UUIDs
4. Test with invalid concept/resource types

## 📝 Response Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database/server issues |

## 🐛 Troubleshooting

### Common Issues:
1. **Port 3000 not responding**: Make sure your NestJS app is running
2. **403 Forbidden**: Check user roles in API Gateway headers (x-user-roles)
3. **400 Bad Request**: Validate JSON payload against DTOs
4. **500 Server Error**: Check Neo4j connection and logs
5. **Headers not working**: Ensure header names are exact: `x-user-id`, `x-user-roles`, `x-user-name`

### Debug Steps:
1. Check application logs in the terminal for user authentication info
2. Verify Neo4j is running (neo4j://127.0.0.1:7687)
3. Test simple endpoints first (health, hello) - no headers needed
4. Try no-auth requests first to see default development user behavior
5. Use Postman Console to see raw requests/responses

## 📚 Additional Resources

- Check your application logs for detailed error messages
- Refer to the Swagger documentation if available at `/api-docs`
- Review the DTO files for exact field requirements
- Check the service tests for example usage patterns

Happy Testing! 🚀