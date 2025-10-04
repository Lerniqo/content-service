# 📤 Resource Upload API - Postman Testing Guide

This guide focuses specifically on testing the **POST /resources** endpoint for uploading educational resources.

## 📋 Base Setup

### Collection Variables
In Postman, set these collection variables:
- `base_url`: `http://localhost:3000`
- `admin_user_id`: `admin-123`
- `teacher_user_id`: `teacher-456`

## 🎯 Available Endpoints

Your Content Service now has these endpoints:
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | Hello World | No | - |
| GET | `/health` | Health check | No | - |
| **POST** | **`/resources`** | **Upload resource** | **Yes** | **teacher, admin** |

## 🎯 Resource Upload ExamplesUpload API - Postman Testing Guide

This guide focuses specifically on testing the **POST /resources** endpoint for uploading educational resources.

## 📋 Base Setup

### 1. Collection Variables
In Postman, set these collection variables:
- `base_url`: `http://localhost:3000`
- `admin_user_id`: `admin-123`
- `teacher_user_id`: `teacher-456`

## 🎯 Resource Upload Examples

### Example 1: Health Check (No Auth Required)

**Method:** `GET`
**URL:** `{{base_url}}/health`
**Headers:** None required

**Expected Response:**
```json
"Service is healthy"
```

---

### Example 2: Hello World (No Auth Required)

**Method:** `GET`
**URL:** `{{base_url}}/`
**Headers:** None required

**Expected Response:**
```json
"Hello World!"
```

---

### Example 3: Create Subject Concept (Admin)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "olm001-subject",
  "name": "Ordinary Level Mathematics (OLM001)",
  "type": "Subject",
  "description": "Core mathematics curriculum for ordinary level"
}
```

**Expected Response:** Concept object with created properties

---

### Example 4: Create Matter Concept (Child of Subject)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "mat001-numbers",
  "name": "Numbers (MAT001)",
  "type": "Matter",
  "description": "Fundamental concepts of numbers",
  "parentId": "olm001-subject"
}
```

---

### Example 5: Create Molecule Concept (Child of Matter)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "mol001-fractions",
  "name": "Fractions (MOL001)",
  "type": "Molecule",
  "description": "Operations and properties of fractions",
  "parentId": "mat001-numbers"
}
```

---

### Example 6: Create Atom Concept (Child of Molecule)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "atm001-multiplication",
  "name": "Multiplication of Fractions (ATM001)",
  "type": "Atom",
  "description": "Multiplying fractions",
  "parentId": "mol001-fractions"
}
```

---

### Example 7: Create Particle Concept (Child of Atom)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "par001-fraction-multiplication",
  "name": "fraction-multiplication (PAR001)",
  "type": "Particle",
  "description": "Rules for multiplying fractions",
  "parentId": "atm001-multiplication"
}
```

---

### Example 8: Update Concept

**Method:** `PUT`
**URL:** `{{base_url}}/concepts/mol001-fractions`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "name": "Advanced Fractions (MOL001)",
  "description": "Updated description for advanced fraction operations"
}
```

---

### Example 9: Create Prerequisite Relationship

**Method:** `POST`
**URL:** `{{base_url}}/concepts/atm001-multiplication/prerequisites`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "prerequisiteId": "par001-fraction-multiplication"
}
```

---

### Example 10: Create Video Resource (Admin)

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
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

---

### Example 11: Create Document Resource (Teacher)

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: Teacher User
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Fractions Worksheet",
  "type": "document",
  "description": "Practice worksheet for fraction operations",
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

### Example 12: Create Free Quiz Resource

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: Teacher User
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Basic Fraction Quiz",
  "type": "quiz",
  "description": "Free interactive quiz on basic fractions",
  "url": "https://example.com/quiz/basic-fractions",
  "isPublic": true,
  "tags": ["mathematics", "fractions", "quiz", "interactive"],
  "conceptId": "mol001-fractions",
  "gradeLevel": "Grade 8",
  "subject": "Mathematics"
}
```

---

## 🧪 Authorization Test Examples

### Example 13: Test Development Mode (No Headers)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
```
*(No auth headers - should use default admin)*

**Body (JSON):**
```json
{
  "conceptId": "test-default-concept",
  "name": "Default Auth Test",
  "type": "Particle",
  "description": "Testing default authentication"
}
```

---

### Example 14: Test Direct User Header (Development)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
user: {"id": "dev-admin-123", "role": ["admin"], "username": "dev-admin"}
```

**Body (JSON):**
```json
{
  "conceptId": "test-dev-header",
  "name": "Dev Header Test",
  "type": "Particle", 
  "description": "Testing direct user header auth"
}
```

---

### Example 15: Test Teacher Role Restriction (Should Fail)

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: Teacher User
```

**Body (JSON):**
```json
{
  "conceptId": "teacher-fail-concept",
  "name": "Teacher Should Not Create Concepts",
  "type": "Particle",
  "description": "This should fail with 403 Forbidden"
}
```

**Expected Response:** `403 Forbidden` error

---

## 🚫 Error Testing Examples

### Example 16: Invalid Concept Type

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "conceptId": "invalid-concept",
  "name": "Invalid Type Test",
  "type": "InvalidType",
  "description": "Testing invalid concept type"
}
```

**Expected Response:** `400 Bad Request` with validation error

---

### Example 17: Missing Required Fields

**Method:** `POST`
**URL:** `{{base_url}}/concepts`

**Headers:**
```
Content-Type: application/json
x-user-id: {{admin_user_id}}
x-user-roles: admin
x-user-name: Admin User
```

**Body (JSON):**
```json
{
  "name": "Incomplete Concept"
}
```

**Expected Response:** `400 Bad Request` with validation errors

---

### Example 18: Invalid Resource Type

**Method:** `POST`
**URL:** `{{base_url}}/resources`

**Headers:**
```
Content-Type: application/json
x-user-id: {{teacher_user_id}}
x-user-roles: teacher
x-user-name: Teacher User
```

**Body (JSON):**
```json
{
  "resourceId": "550e8400-e29b-41d4-a716-446655440004",
  "name": "Invalid Resource",
  "type": "invalid-type",
  "url": "https://example.com/resource",
  "isPublic": true,
  "conceptId": "mol001-fractions"
}
```

**Expected Response:** `400 Bad Request` with validation error

---

## 📊 Testing Workflow

### Complete Learning Path Creation:

1. **Create Subject** (Example 3)
2. **Create Matter** (Example 4) 
3. **Create Molecule** (Example 5)
4. **Create Atom** (Example 6)
5. **Create Particle** (Example 7)
6. **Add Prerequisites** (Example 9)
7. **Create Resources** (Examples 10-12)

### Authorization Testing:

1. **Admin Access** ✅ (Examples 3-9)
2. **Teacher Access** ✅ (Examples 11-12)
3. **Teacher Restriction** ❌ (Example 15)
4. **Development Fallback** ✅ (Examples 13-14)

### Error Handling Testing:

1. **Invalid Types** (Examples 16, 18)
2. **Missing Fields** (Example 17)
3. **Non-existent Parents** (Try invalid `parentId`)

## 🔧 Pro Tips

1. **Start Simple:** Begin with health check and hello world
2. **Build Hierarchy:** Create concepts in order (Subject → Matter → Molecule → Atom → Particle)
3. **Test Auth:** Verify different roles work correctly
4. **Check Logs:** Monitor the application console for detailed error messages
5. **Use Variables:** Set up collection variables for reusable values

## 📝 Expected Response Codes

- `200 OK` - Successful GET/PUT operations
- `201 Created` - Successful POST operations
- `400 Bad Request` - Invalid input data
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Database/server issues

Happy Testing! 🎉