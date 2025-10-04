import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

// Example DTOs for demonstration
class CreateUserDto {
  username: string;
  email: string;
  password: string;
}

@Controller('example')
export class ExampleController {
  // Example: Successful response
  @Get('success')
  getSuccess() {
    return { message: 'Success!', data: { id: 1, name: 'John Doe' } };
  }

  // Example: Not Found Exception (404)
  @Get('user/:id')
  getUser(@Param('id') id: string) {
    if (id === '999') {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  // Example: Validation Error (400)
  @Post('users')
  createUser(@Body() createUserDto: CreateUserDto) {
    const errors: string[] = [];

    if (!createUserDto.username) {
      errors.push('username is required');
    }

    if (!createUserDto.email || !createUserDto.email.includes('@')) {
      errors.push('email must be a valid email address');
    }

    if (!createUserDto.password || createUserDto.password.length < 8) {
      errors.push('password must be at least 8 characters long');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: errors,
        error: 'Validation Error',
      });
    }

    return {
      id: 1,
      username: createUserDto.username,
      email: createUserDto.email,
      message: 'User created successfully',
    };
  }

  // Example: Custom Business Logic Error (409)
  @Post('users/duplicate')
  createDuplicateUser(@Body() createUserDto: CreateUserDto) {
    // Simulate duplicate user check
    if (createUserDto.username === 'admin') {
      throw new HttpException(
        {
          message: 'Username already exists',
          error: 'Conflict',
          details: { field: 'username', value: createUserDto.username },
        },
        HttpStatus.CONFLICT,
      );
    }

    return { message: 'User created successfully' };
  }

  // Example: Internal Server Error (500)
  @Get('server-error')
  getServerError() {
    // Simulate a server error (e.g., database connection failure)
    const error = new Error('Database connection failed');
    error.name = 'DatabaseError';
    throw error;
  }

  // Example: Unauthorized Error (401)
  @Get('protected')
  getProtected() {
    const error = new Error('Invalid or expired token');
    error.name = 'UnauthorizedError';
    throw error;
  }

  // Example: Generic Error
  @Get('generic-error')
  getGenericError() {
    throw new Error('Something went wrong');
  }

  // Example: Custom HttpException with detailed response
  @Post('complex-validation')
  complexValidation(@Body() data: any) {
    const validationErrors = [
      {
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Email must be in valid format',
        value: data.email,
      },
      {
        field: 'age',
        code: 'OUT_OF_RANGE',
        message: 'Age must be between 18 and 100',
        value: data.age,
      },
    ];

    throw new HttpException(
      {
        message: 'Validation failed',
        error: 'ValidationError',
        statusCode: HttpStatus.BAD_REQUEST,
        details: {
          errors: validationErrors,
          timestamp: new Date().toISOString(),
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
