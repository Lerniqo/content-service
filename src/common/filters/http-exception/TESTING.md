# Testing the HTTP Exception Filter

This guide shows how to test the HTTP exception filter with various error scenarios.

## Setup

1. The filter is already registered globally in `main.ts`
2. Start the development server:

```bash
npm run start:dev
```

## Test Endpoints

Use the example controller endpoints to test different error scenarios:

### 1. Success Response
```bash
curl http://localhost:3000/example/success
```

**Expected Response:**
```json
{
  "message": "Success!",
  "data": { "id": 1, "name": "John Doe" }
}
```

### 2. Not Found Error (404)
```bash
curl http://localhost:3000/example/user/999
```

**Expected Response:**
```json
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/user/999",
  "method": "GET",
  "message": "User with ID 999 not found",
  "error": "NotFoundException"
}
```

### 3. Validation Error (400)
```bash
curl -X POST http://localhost:3000/example/users \
  -H "Content-Type: application/json" \
  -d '{"username": "", "email": "invalid-email", "password": "123"}'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/users",
  "method": "POST",
  "message": [
    "username is required",
    "email must be a valid email address",
    "password must be at least 8 characters long"
  ],
  "error": "Validation Error",
  "details": {
    "message": [...],
    "error": "Validation Error"
  }
}
```

### 4. Conflict Error (409)
```bash
curl -X POST http://localhost:3000/example/users/duplicate \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com", "password": "password123"}'
```

**Expected Response:**
```json
{
  "statusCode": 409,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/users/duplicate",
  "method": "POST",
  "message": "Username already exists",
  "error": "Conflict",
  "details": {
    "message": "Username already exists",
    "error": "Conflict",
    "details": { "field": "username", "value": "admin" }
  }
}
```

### 5. Internal Server Error (500)
```bash
curl http://localhost:3000/example/server-error
```

**Expected Response:**
```json
{
  "statusCode": 500,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/server-error",
  "method": "GET",
  "message": "Internal server error",
  "error": "DatabaseError"
}
```

### 6. Unauthorized Error (401)
```bash
curl http://localhost:3000/example/protected
```

**Expected Response:**
```json
{
  "statusCode": 401,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/protected",
  "method": "GET",
  "message": "Invalid or expired token",
  "error": "UnauthorizedError"
}
```

### 7. Complex Validation with Request ID
```bash
curl -X POST http://localhost:3000/example/complex-validation \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-123" \
  -d '{"email": "invalid", "age": 15}'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/example/complex-validation",
  "method": "POST",
  "message": "Validation failed",
  "error": "ValidationError",
  "requestId": "test-123",
  "details": {
    "message": "Validation failed",
    "error": "ValidationError",
    "statusCode": 400,
    "details": {
      "errors": [
        {
          "field": "email",
          "code": "INVALID_FORMAT",
          "message": "Email must be in valid format",
          "value": "invalid"
        },
        {
          "field": "age",
          "code": "OUT_OF_RANGE",
          "message": "Age must be between 18 and 100",
          "value": 15
        }
      ],
      "timestamp": "..."
    }
  }
}
```

## Log Output Examples

When these endpoints are called, you'll see structured logs in your console:

### Client Error Log (4xx):
```json
{
  "level": "warn",
  "time": 1642244400000,
  "msg": "Client Error: Username already exists",
  "statusCode": 409,
  "method": "POST",
  "url": "/example/users/duplicate",
  "userAgent": "curl/7.79.1",
  "ip": "::1",
  "requestId": "test-123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "body": {
    "username": "admin",
    "email": "admin@example.com",
    "password": "[REDACTED]"
  },
  "params": {},
  "query": {}
}
```

### Server Error Log (5xx):
```json
{
  "level": "error",
  "time": 1642244400000,
  "msg": "Server Error: Internal server error",
  "statusCode": 500,
  "method": "GET",
  "url": "/example/server-error",
  "userAgent": "curl/7.79.1",
  "ip": "::1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "exception": {
    "name": "DatabaseError",
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ExampleController.getServerError ..."
  }
}
```

## Integration with Your Controllers

To add the example controller to your app, update your `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { LoggerModule } from 'nestjs-pino';
import { ExampleController } from '../common/filters/http-exception/example.controller';

@Module({
    imports: [LoggerModule.forRoot()],
    controllers: [AppController, ExampleController], // Add ExampleController here
    providers: [AppService],
})
export class AppModule {}
```

## Monitoring and Alerting

The structured error logs can be easily monitored and used for alerting:

1. **Error Rate Monitoring**: Monitor the frequency of 5xx errors
2. **Client Error Analysis**: Analyze 4xx errors to improve API documentation and validation
3. **Request Tracing**: Use request IDs to trace requests across services
4. **Performance Monitoring**: Track error response times and patterns

## Production Considerations

1. **Log Level**: Set appropriate log levels in production (usually 'warn' or 'error')
2. **Log Retention**: Configure log rotation and retention policies
3. **Sensitive Data**: The filter automatically sanitizes passwords and tokens, but review for any additional sensitive fields
4. **Monitoring**: Set up alerts for high error rates or specific error patterns

## Custom Error Classes

Create domain-specific error classes for better error handling:

```typescript
export class UserNotFoundError extends HttpException {
  constructor(userId: string) {
    super(
      {
        message: `User with ID ${userId} not found`,
        error: 'UserNotFound',
        details: { userId }
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class ValidationError extends HttpException {
  constructor(errors: Array<{ field: string; message: string }>) {
    super(
      {
        message: 'Validation failed',
        error: 'ValidationError',
        details: { errors }
      },
      HttpStatus.BAD_REQUEST
    );
  }
}
```
