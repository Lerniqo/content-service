# HTTP Exception Filter

A comprehensive global exception filter for NestJS applications that provides structured error handling and logging using Pino logger.

## Features

- **Global Error Handling**: Catches all unhandled exceptions across the application
- **Structured Error Responses**: Returns consistent, well-formatted error responses
- **Pino Logger Integration**: Uses Pino for structured, high-performance logging
- **Intelligent Status Code Mapping**: Maps common error types to appropriate HTTP status codes
- **Comprehensive Logging**: Logs errors with different severity levels based on status codes
- **Request Context**: Includes request details like method, path, IP, user agent, and request ID
- **Security**: Sanitizes sensitive information from request bodies in logs
- **Development Support**: Includes stack traces and additional debug info in development mode

## Error Response Structure

All errors return a consistent JSON structure:

```typescript
interface ErrorResponse {
  statusCode: number;        // HTTP status code
  timestamp: string;         // ISO timestamp when error occurred
  path: string;             // Request path that caused the error
  method: string;           // HTTP method (GET, POST, etc.)
  message: string | object; // Error message or validation details
  error?: string;           // Error type/name
  details?: any;            // Additional error details (dev mode only for some errors)
  requestId?: string;       // Request ID from x-request-id header (if present)
}
```

## Usage

### Global Registration (Already configured in main.ts)

```typescript
import { PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get PinoLogger instance and create the filter with it
  const pinoLogger = app.get(PinoLogger);
  app.useGlobalFilters(new HttpExceptionFilter(pinoLogger));
  
  await app.listen(3000);
}
```

### Controller-Level Registration

```typescript
import { UseFilters, Controller } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from '../common/filters/http-exception/http-exception.filter';

@Controller('users')
export class UsersController {
  constructor(private readonly logger: PinoLogger) {}

  @UseFilters(new HttpExceptionFilter(this.logger))
  @Get()
  findAll() {
    // ...
  }
}
```

### Method-Level Registration

```typescript
@UseFilters(new HttpExceptionFilter(pinoLogger))
@Get(':id')
async findOne(@Param('id') id: string) {
  // ...
}
```

## Error Type Mapping

The filter automatically maps common error types to appropriate HTTP status codes:

| Error Type | HTTP Status | Code |
|------------|-------------|------|
| ValidationError | Bad Request | 400 |
| UnauthorizedError | Unauthorized | 401 |
| ForbiddenError | Forbidden | 403 |
| NotFoundError | Not Found | 404 |
| ConflictError | Conflict | 409 |
| TimeoutError | Request Timeout | 408 |
| Other errors | Internal Server Error | 500 |

## Logging with Pino

The filter uses Pino for structured logging with different levels based on the HTTP status code:

- **error (5xx)**: Server errors with full exception details and stack traces
- **warn (4xx)**: Client errors with request context and sanitized body  
- **info (others)**: Other exceptions with basic context

### Pino Log Structure

Pino logs are structured JSON with the following format:

```json
{
  "level": 30,
  "time": 1642244400000,
  "pid": 12345,
  "hostname": "localhost", 
  "context": "HttpExceptionFilter",
  "statusCode": 400,
  "method": "POST",
  "url": "/api/users",
  "userAgent": "curl/7.79.1",
  "ip": "::1",
  "requestId": "req-12345",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "body": { "username": "john", "password": "[REDACTED]" },
  "params": {},
  "query": {},
  "msg": "Client Error: Validation failed"
}
```

## Security Features

### Request Body Sanitization

Sensitive fields are automatically redacted from logs:

- `password`
- `token` 
- `secret`
- `key`
- `authorization`

Example:
```json
// Original request body
{ "username": "john", "password": "secret123", "email": "john@example.com" }

// Logged body (sanitized)
{ "username": "john", "password": "[REDACTED]", "email": "john@example.com" }
```

### Environment-Aware Details

- **Development**: Includes stack traces and detailed error information
- **Production**: Hides sensitive error details and stack traces

## Example Responses

### Validation Error (400)

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": ["email must be a valid email", "password must be at least 8 characters"],
  "error": "ValidationError",
  "requestId": "req-12345"
}
```

### Not Found Error (404)

```json
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users/999",
  "method": "GET",
  "message": "User not found",
  "error": "NotFoundException",
  "requestId": "req-12346"
}
```

### Internal Server Error (500)

```json
{
  "statusCode": 500,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "message": "Internal server error",
  "error": "DatabaseConnectionError",
  "requestId": "req-12347"
}
```

## Request ID Support

The filter supports request tracking through the `x-request-id` header. This is useful for:

- Correlating logs across microservices
- Debugging specific requests
- Performance monitoring

To use request IDs, include the header in your requests:

```bash
curl -H "x-request-id: unique-request-id-123" http://localhost:3000/api/users
```

## Best Practices

1. **Use Specific Exception Types**: Create custom exception classes that inherit from `HttpException` for better error categorization.

2. **Include Request IDs**: Always include `x-request-id` headers in your requests for better traceability.

3. **Structured Error Messages**: For validation errors, provide structured messages that clients can parse.

4. **Monitor Error Rates**: Use the structured logs to monitor error rates and identify issues.

5. **Custom Error Types**: Create domain-specific error classes for better error handling:

```typescript
export class UserNotFoundError extends HttpException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}
```

## Testing

The filter includes comprehensive tests covering:

- HttpException handling
- Generic error handling  
- Logging levels
- Request body sanitization
- Response structure validation

Run tests with:

```bash
npm test src/common/filters/http-exception/http-exception.filter.spec.ts
```

## Configuration

The filter works with the existing Pino logger configuration in your `AppModule`. No additional configuration is required.

For custom logging configuration, refer to the [nestjs-pino documentation](https://github.com/iamolegga/nestjs-pino).
