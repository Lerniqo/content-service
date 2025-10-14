/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException } from '@nestjs/common';
import { ConceptResponseDto } from './dto/concept-response.dto';
import { ConceptPrerequisiteDto } from './dto/concept-prerequisite.dto';
import { LearningResourceDto } from './dto/learning-resource.dto';

describe('ConceptsController', () => {
  let controller: ConceptsController;
  let service: ConceptsService;

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockConceptsService = {
    getConceptById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConceptsController],
      providers: [
        {
          provide: ConceptsService,
          useValue: mockConceptsService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ConceptsController>(ConceptsController);
    service = module.get<ConceptsService>(ConceptsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConceptById', () => {
    it('should return a concept with prerequisites and resources', async () => {
      // Arrange
      const conceptId = 'test-concept-id';
      const prerequisites = [
        new ConceptPrerequisiteDto(
          'prereq-1',
          'Basic Addition',
          'Atom',
          'Fundamental addition operations',
        ),
      ];
      const learningResources = [
        new LearningResourceDto(
          'resource-1',
          'Math Video',
          'video',
          'Educational video',
          'https://example.com/video',
          true,
          0,
          ['math', 'basics'],
          'Grade 8',
          'Mathematics',
        ),
      ];
      const expectedResult = new ConceptResponseDto(
        conceptId,
        'Multiplication of Fractions',
        'Atom',
        prerequisites,
        learningResources,
        'Learn how to multiply fractions',
        '2024-10-04T10:30:00Z',
      );

      mockConceptsService.getConceptById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getConceptById(conceptId);

      // Assert
      expect(service.getConceptById).toHaveBeenCalledWith(conceptId);
      expect(result).toEqual(expectedResult);
      expect(result.conceptId).toBe(conceptId);
      expect(result.prerequisites).toHaveLength(1);
      expect(result.learningResources).toHaveLength(1);
    });

    it('should handle concept not found', async () => {
      // Arrange
      const conceptId = 'nonexistent-id';
      mockConceptsService.getConceptById.mockRejectedValue(
        new NotFoundException(`Concept with ID ${conceptId} not found`),
      );

      // Act & Assert
      await expect(controller.getConceptById(conceptId)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getConceptById).toHaveBeenCalledWith(conceptId);
    });

    it('should return concept with empty prerequisites and resources arrays when none exist', async () => {
      // Arrange
      const conceptId = 'test-concept-id';
      const expectedResult = new ConceptResponseDto(
        conceptId,
        'Basic Concept',
        'Particle',
        [], // No prerequisites
        [], // No resources
        'A basic concept with no dependencies',
        '2024-10-04T10:30:00Z',
      );

      mockConceptsService.getConceptById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getConceptById(conceptId);

      // Assert
      expect(result.prerequisites).toEqual([]);
      expect(result.learningResources).toEqual([]);
      expect(result.conceptId).toBe(conceptId);
    });
  });
});
