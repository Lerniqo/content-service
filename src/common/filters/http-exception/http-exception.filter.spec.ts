import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;
  let mockPinoLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    // Create mock PinoLogger
    mockPinoLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        HttpExceptionFilter,
      ],
    }).compile();

    filter = moduleRef.get<HttpExceptionFilter>(HttpExceptionFilter);

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock request object
    mockRequest = {
      url: '/test-endpoint',
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': 'test-request-id',
      },
      ip: '127.0.0.1',
      body: { test: 'data' },
      params: { id: '1' },
      query: { page: '1' },
    };

    // Mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Bad Request',
          error: 'HttpException',
          path: '/test-endpoint',
          method: 'GET',
          requestId: 'test-request-id',
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: ['field1 is required', 'field2 must be a string'],
        error: 'Validation Error',
        statusCode: 400,
      };
      const exception = new HttpException(exceptionResponse, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: ['field1 is required', 'field2 must be a string'],
          error: 'Validation Error',
          details: exceptionResponse,
        }),
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should handle validation errors with BAD_REQUEST status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          error: 'ValidationError',
        }),
      );
    });

    it('should handle unauthorized errors with UNAUTHORIZED status', () => {
      const error = new Error('Invalid token');
      error.name = 'UnauthorizedError';
      
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle unknown errors with INTERNAL_SERVER_ERROR status', () => {
      const error = new Error('Database connection failed');
      
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          error: 'Error',
        }),
      );
    });
  });

  describe('Logging', () => {
    it('should log server errors (5xx) as error level', () => {
      const exception = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      
      filter.catch(exception, mockHost);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          method: 'GET',
          url: '/test-endpoint',
        }),
        'Server Error: Internal Server Error',
      );
    });

    it('should log client errors (4xx) as warning level', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          method: 'GET',
          url: '/test-endpoint',
          body: { test: 'data' },
        }),
        'Client Error: Bad Request',
      );
    });
  });

  describe('Request body sanitization', () => {
    it('should sanitize sensitive fields in request body', () => {
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        token: 'bearer-token',
      };

      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            username: 'testuser',
            password: '[REDACTED]',
            token: '[REDACTED]',
          },
        }),
        'Client Error: Bad Request',
      );
    });
  });

  describe('Response structure', () => {
    it('should include all required fields in error response', () => {
      const exception = new HttpException('Test Error', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          timestamp: expect.any(String),
          path: expect.any(String),
          method: expect.any(String),
          message: expect.any(String),
          error: expect.any(String),
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle request without request-id header', () => {
      mockRequest.headers = { 'user-agent': 'test-agent' };
      const exception = new HttpException('Test Error', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: undefined,
        }),
      );
    });
  });
});
