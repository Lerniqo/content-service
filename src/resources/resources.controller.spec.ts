/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PinoLogger } from 'nestjs-pino';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateResourceResponseDto } from './dto/create-resource-response.dto';

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: ResourcesService;

  const mockResourcesService = {
    createResource: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [
        {
          provide: ResourcesService,
          useValue: mockResourcesService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ResourcesController>(ResourcesController);
    service = module.get<ResourcesService>(ResourcesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const mockCreateResourceDto: CreateResourceDto = {
      id: 'test-resource-123',
      name: 'Test Resource',
      type: 'video',
      description: 'A test resource',
      url: 'https://example.com/resource',
      isPublic: true,
      price: 9.99,
      tags: ['test', 'example'],
      conceptId: 'test-concept-123',
    };

    const mockRequest = {
      user: {
        id: 'test-user-123',
        role: ['teacher'],
      },
    };

    const mockResponse = new CreateResourceResponseDto(
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'https://api-gateway.example.com/upload/abc123?signature=xyz789',
    );

    it('should create a resource successfully', async () => {
      mockResourcesService.createResource.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateResourceDto, mockRequest as any);

      expect(result).toBe(mockResponse);
      expect(mockResourcesService.createResource).toHaveBeenCalledWith(
        mockCreateResourceDto,
        'test-user-123',
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockResourcesService.createResource.mockRejectedValue(error);

      await expect(
        controller.create(mockCreateResourceDto, mockRequest as any),
      ).rejects.toThrow('Service error');
    });
  });
});
