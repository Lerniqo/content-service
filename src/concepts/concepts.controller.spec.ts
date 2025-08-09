import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';
import { Logger } from 'nestjs-pino';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateConceptDto } from './dto/create-concept.dto';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('ConceptsController', () => {
  let controller: ConceptsController;
  let conceptsService: ConceptsService;
  let logger: Logger;
  let rolesGuard: RolesGuard;

  const mockConceptsService = {
    createConcept: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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
          provide: Logger,
          useValue: mockLogger,
        },
        RolesGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<ConceptsController>(ConceptsController);
    conceptsService = module.get<ConceptsService>(ConceptsService);
    logger = module.get<Logger>(Logger);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /concepts', () => {
    const validCreateConceptDto: CreateConceptDto = {
      id: 'concept-123',
      name: 'Matter',
      type: 'Matter',
      dependantConceptId: 'parent-concept-456',
    };

    const mockRequest = {
      user: {
        id: 'admin-123',
        role: ['admin'],
      },
    } as any;

    const mockCreatedConcept = {
      records: [
        {
          get: () => ({
            properties: {
              id: 'concept-123',
              name: 'Matter',
              type: 'Matter',
            },
          }),
        },
      ],
    };

    it('should create a concept successfully', async () => {
      mockConceptsService.createConcept.mockResolvedValue(mockCreatedConcept);

      const result = await controller.create(validCreateConceptDto, mockRequest);

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123'
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Creating concept with data: ${JSON.stringify(validCreateConceptDto)} by admin-123`,
        ConceptsController.name
      );
      expect(result).toEqual(mockCreatedConcept);
    });

    it('should create a concept without dependantConceptId', async () => {
      const conceptWithoutParent: CreateConceptDto = {
        id: 'concept-456',
        name: 'Atom',
        type: 'Atom',
      };

      mockConceptsService.createConcept.mockResolvedValue(mockCreatedConcept);

      const result = await controller.create(conceptWithoutParent, mockRequest);

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        conceptWithoutParent,
        'admin-123'
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Creating concept with data: ${JSON.stringify(conceptWithoutParent)} by admin-123`,
        ConceptsController.name
      );
      expect(result).toEqual(mockCreatedConcept);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest)
      ).rejects.toThrow('Database connection failed');

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123'
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Creating concept with data: ${JSON.stringify(validCreateConceptDto)} by admin-123`,
        ConceptsController.name
      );
    });

    it('should handle concept already exists error', async () => {
      const error = new Error('Concept with ID concept-123 already exists.');
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest)
      ).rejects.toThrow('Concept with ID concept-123 already exists.');

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123'
      );
    });

    it('should handle parent concept not found error', async () => {
      const error = new Error('Parent concept with ID parent-concept-456 does not exist.');
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest)
      ).rejects.toThrow('Parent concept with ID parent-concept-456 does not exist.');

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123'
      );
    });

    it('should extract admin ID from request correctly', async () => {
      const requestWithDifferentAdminId = {
        user: {
          id: 'admin-999',
          role: ['admin'],
          email: 'admin@example.com',
          name: 'Admin User',
        },
      } as any;

      mockConceptsService.createConcept.mockResolvedValue(mockCreatedConcept);

      await controller.create(validCreateConceptDto, requestWithDifferentAdminId);

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-999'
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Creating concept with data: ${JSON.stringify(validCreateConceptDto)} by admin-999`,
        ConceptsController.name
      );
    });

    it('should log the request correctly with all DTO fields', async () => {
      const detailedConceptDto: CreateConceptDto = {
        id: 'detailed-concept-789',
        name: 'Complex Molecule',
        type: 'Molecule',
        dependantConceptId: 'matter-concept-123',
      };

      mockConceptsService.createConcept.mockResolvedValue(mockCreatedConcept);

      await controller.create(detailedConceptDto, mockRequest);

      expect(logger.log).toHaveBeenCalledWith(
        `Creating concept with data: ${JSON.stringify(detailedConceptDto)} by admin-123`,
        ConceptsController.name
      );
    });
  });

  describe('RolesGuard Integration', () => {
    it('should be protected by RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', ConceptsController);
      expect(guards).toContain(RolesGuard);
    });

    it('should require admin role for create method', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toContain('admin');
    });
  });
});
