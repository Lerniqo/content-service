/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { PinoLogger } from 'nestjs-pino';
import { CreateResourceDto } from './dto/create-resource.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createResource', () => {
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

    const mockUserId = 'test-user-123';

    it('should successfully create a resource', async () => {
      // Mock concept exists
      mockNeo4jService.read.mockResolvedValueOnce([{ conceptId: 'test-concept-123' }]);
      
      // Mock user exists
      mockNeo4jService.read.mockResolvedValueOnce([{ userId: mockUserId, roles: ['Teacher'] }]);
      
      // Mock resource creation
      mockNeo4jService.write.mockResolvedValueOnce([{ resourceId: 'generated-uuid' }]);
      
      // Mock EXPLAINS relationship
      mockNeo4jService.write.mockResolvedValueOnce([{ relationship: 'EXPLAINS' }]);
      
      // Mock PUBLISHED relationship
      mockNeo4jService.write.mockResolvedValueOnce([{ relationship: 'PUBLISHED' }]);

      const result = await service.createResource(mockCreateResourceDto, mockUserId);

      expect(result).toHaveProperty('resourceId');
      expect(result).toHaveProperty('uploadUrl');
      expect(result.uploadUrl).toContain('api-gateway.example.com');
      expect(mockNeo4jService.read).toHaveBeenCalledTimes(2);
      expect(mockNeo4jService.write).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException when concept does not exist', async () => {
      // Mock concept does not exist
      mockNeo4jService.read.mockResolvedValueOnce([]);

      await expect(
        service.createResource(mockCreateResourceDto, mockUserId)
      ).rejects.toThrow(NotFoundException);

      expect(mockNeo4jService.read).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user does not exist or lacks proper role', async () => {
      // Mock concept exists
      mockNeo4jService.read.mockResolvedValueOnce([{ conceptId: 'test-concept-123' }]);
      
      // Mock user does not exist
      mockNeo4jService.read.mockResolvedValueOnce([]);

      await expect(
        service.createResource(mockCreateResourceDto, mockUserId)
      ).rejects.toThrow(NotFoundException);

      expect(mockNeo4jService.read).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      // Mock concept exists
      mockNeo4jService.read.mockResolvedValueOnce([{ conceptId: 'test-concept-123' }]);
      
      // Mock user exists
      mockNeo4jService.read.mockResolvedValueOnce([{ userId: mockUserId, roles: ['Teacher'] }]);
      
      // Mock database error during resource creation
      mockNeo4jService.write.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.createResource(mockCreateResourceDto, mockUserId)
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockNeo4jService.write).toHaveBeenCalledTimes(1);
    });
  });
});
