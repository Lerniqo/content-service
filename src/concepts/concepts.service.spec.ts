import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsService } from './concepts.service';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException } from '@nestjs/common';

describe('ConceptsService', () => {
  let service: ConceptsService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    read: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConceptsService,
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

    service = module.get<ConceptsService>(ConceptsService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConceptById', () => {
    it('should return concept with prerequisites and resources', async () => {
      // Arrange
      const conceptId = 'test-concept-id';
      const mockResult = [
        {
          conceptId: 'test-concept-id',
          name: 'Multiplication of Fractions',
          type: 'Atom',
          description: 'Learn how to multiply fractions',
          createdAt: '2024-10-04T10:30:00Z',
          prerequisites: [
            {
              conceptId: 'prereq-1',
              name: 'Basic Addition',
              type: 'Atom',
              description: 'Fundamental addition operations',
            },
          ],
          resources: [
            {
              resourceId: 'resource-1',
              name: 'Math Video',
              type: 'video',
              description: 'Educational video',
              url: 'https://example.com/video',
              isPublic: true,
              price: 0,
              tags: ['math', 'basics'],
              gradeLevel: 'Grade 8',
              subject: 'Mathematics',
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockResult);

      // Act
      const result = await service.getConceptById(conceptId);

      // Assert
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (c:SyllabusConcept {conceptId: $conceptId})'),
        { conceptId },
      );
      expect(result.conceptId).toBe(conceptId);
      expect(result.name).toBe('Multiplication of Fractions');
      expect(result.prerequisites).toHaveLength(1);
      expect(result.learningResources).toHaveLength(1);
    });

    it('should throw NotFoundException when concept does not exist', async () => {
      // Arrange
      const conceptId = 'nonexistent-id';
      mockNeo4jService.read.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getConceptById(conceptId)).rejects.toThrow(
        NotFoundException,
      );
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (c:SyllabusConcept {conceptId: $conceptId})'),
        { conceptId },
      );
    });

    it('should handle concept with no prerequisites or resources', async () => {
      // Arrange
      const conceptId = 'simple-concept-id';
      const mockResult = [
        {
          conceptId: 'simple-concept-id',
          name: 'Basic Concept',
          type: 'Particle',
          description: 'A basic concept',
          createdAt: '2024-10-04T10:30:00Z',
          prerequisites: [{ conceptId: null, name: null, type: null, description: null }],
          resources: [{ resourceId: null, name: null, type: null }],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockResult);

      // Act
      const result = await service.getConceptById(conceptId);

      // Assert
      expect(result.prerequisites).toEqual([]);
      expect(result.learningResources).toEqual([]);
    });
  });
});
