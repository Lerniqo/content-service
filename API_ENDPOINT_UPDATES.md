# 🔄 API ENDPOINT UPDATES

## ✅ **Changes Made:**

### **1. API Base Path Updated:**
- **Before:** `http://localhost:3000/resources`
- **After:** `http://localhost:4001/api/content/resources`

### **2. Port Changed:**
- **Before:** Port 3000
- **After:** Port 4001

### **3. Global API Prefix Added:**
- All endpoints now prefixed with `/api/content`

## 🌐 **New API Endpoints:**

| Method | Old Endpoint | New Endpoint |
|--------|-------------|--------------|
| POST | `http://localhost:3000/resources` | `http://localhost:4001/api/content/resources` |
| GET | `http://localhost:3000/health` | `http://localhost:4001/api/content/health` |
| GET | `http://localhost:3000/` | `http://localhost:4001/api/content/` |

## 📋 **Updated Postman Collection:**

### **Base URL Configuration:**
```
base_url: http://localhost:4001/api/content
```

### **Resource Upload Example:**
```
POST {{base_url}}/resources
Content-Type: application/json
x-user-id: admin-123
x-user-roles: admin
x-user-name: Admin User

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

### **Health Check:**
```
GET {{base_url}}/health
```

## 🔧 **Environment Configuration:**

### **.env file updated:**
```
NODE_ENV=development
PORT=4001
```

### **CORS Configuration:**
- Added API Gateway headers: `x-user-id`, `x-user-roles`, `x-user-name`
- Updated origins to include new port

## 🚀 **Ready to Test:**

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **Test the new endpoint:**
   ```bash
   curl -X POST http://localhost:4001/api/content/resources \
     -H "Content-Type: application/json" \
     -H "x-user-id: admin-123" \
     -H "x-user-roles: admin" \
     -d '{"resourceId":"test-123","name":"Test Resource","type":"video","url":"https://example.com","isPublic":true,"conceptId":"mol001-fractions"}'
   ```

## 📝 **For Your Update Resource Branch:**

When creating the update resource API, use this base structure:
- **Endpoint:** `PUT /api/content/resources/:id`
- **Port:** 4001
- **Headers:** Same API Gateway authentication
- **Base URL:** `http://localhost:4001/api/content`

**Your service is now properly aligned with `/api/content/resources` structure!** 🎯