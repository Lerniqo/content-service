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
    updateResource: jest.fn(),
    deleteResource: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
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
      resourceId: 'test-resource-123',
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

  describe('update', () => {
    const mockUpdateResourceDto = {
      name: 'Updated Test Resource',
      description: 'An updated test resource',
      price: 14.99,
    };

    const mockRequest = {
      user: {
        id: 'test-user-123',
        role: ['teacher'],
      },
    };

    const mockUpdatedResource = {
      resourceId: 'test-resource-123',
      name: 'Updated Test Resource',
      type: 'video',
      description: 'An updated test resource',
      url: 'https://example.com/resource',
      isPublic: true,
      price: 14.99,
      tags: ['test', 'example'],
      publishedBy: 'test-user-123',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-16T14:45:00Z',
    };

    it('should update a resource successfully', async () => {
      mockResourcesService.updateResource.mockResolvedValue(mockUpdatedResource);

      const result = await controller.update('test-resource-123', mockUpdateResourceDto, mockRequest as any);

      expect(result).toBe(mockUpdatedResource);
      expect(mockResourcesService.updateResource).toHaveBeenCalledWith(
        'test-resource-123',
        mockUpdateResourceDto,
        'test-user-123',
        ['teacher'],
      );
    });

    it('should handle service errors during update', async () => {
      const error = new Error('Update service error');
      mockResourcesService.updateResource.mockRejectedValue(error);

      await expect(
        controller.update('test-resource-123', mockUpdateResourceDto, mockRequest as any),
      ).rejects.toThrow('Update service error');
    });
  });

  describe('delete', () => {
    const mockRequest = {
      user: {
        id: 'test-user-123',
        role: ['teacher'],
      },
    };

    it('should delete a resource successfully', async () => {
      mockResourcesService.deleteResource.mockResolvedValue(undefined);

      const result = await controller.delete('test-resource-123', mockRequest as any);

      expect(result).toEqual({
        message: 'Resource deleted successfully',
        resourceId: 'test-resource-123',
        deletedAt: expect.any(String),
      });
      expect(mockResourcesService.deleteResource).toHaveBeenCalledWith(
        'test-resource-123',
        'test-user-123',
        ['teacher'],
      );
    });

    it('should handle service errors during delete', async () => {
      const error = new Error('Delete service error');
      mockResourcesService.deleteResource.mockRejectedValue(error);

      await expect(
        controller.delete('test-resource-123', mockRequest as any),
      ).rejects.toThrow('Delete service error');
    });

    it('should allow admin to delete any resource', async () => {
      const adminRequest = {
        user: {
          id: 'admin-user-123',
          role: ['admin'],
        },
      };

      mockResourcesService.deleteResource.mockResolvedValue(undefined);

      const result = await controller.delete('test-resource-123', adminRequest as any);

      expect(result).toEqual({
        message: 'Resource deleted successfully',
        resourceId: 'test-resource-123',
        deletedAt: expect.any(String),
      });
      expect(mockResourcesService.deleteResource).toHaveBeenCalledWith(
        'test-resource-123',
        'admin-user-123',
        ['admin'],
      );
    });
  });
});
