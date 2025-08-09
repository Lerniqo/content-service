import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';
import { PinoLogger } from 'nestjs-pino';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('ConceptsController', () => {
  let controller: ConceptsController;
  let conceptsService: ConceptsService;
  let logger: PinoLogger;
  let rolesGuard: RolesGuard;

  const mockConceptsService = {
    createConcept: jest.fn(),
    updateConcept: jest.fn(),
    createPrerequisiteRelationship: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn(),
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
        {
          provide: 'PinoLogger',
          useValue: mockLogger,
        },
        RolesGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<ConceptsController>(ConceptsController);
    conceptsService = module.get<ConceptsService>(ConceptsService);
    logger = module.get<PinoLogger>(PinoLogger);
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
      parentId: 'parent-concept-456',
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

    it('should create a concept without parentId', async () => {
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
        parentId: 'matter-concept-123',
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

    it('should require admin role for update method', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).toContain('admin');
    });
  });

  describe('PUT /concepts/:id', () => {
    const validUpdateConceptDto: UpdateConceptDto = {
      name: 'Updated Matter',
      type: 'Matter',
      parentId: 'new-parent-concept-789',
    };

    const mockRequest = {
      user: {
        id: 'admin-123',
        role: ['admin'],
      },
    } as any;

    const mockUpdatedConcept = {
      id: 'concept-123',
      name: 'Updated Matter',
      type: 'Matter',
    };

    it('should update a concept successfully', async () => {
      mockConceptsService.updateConcept.mockResolvedValue(mockUpdatedConcept);

      const result = await controller.update('concept-123', validUpdateConceptDto, mockRequest);

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        validUpdateConceptDto,
        'admin-123'
      );
      expect(result).toEqual(mockUpdatedConcept);
    });

    it('should update a concept with partial data', async () => {
      const partialUpdateDto: UpdateConceptDto = {
        name: 'Partially Updated Name',
      };

      mockConceptsService.updateConcept.mockResolvedValue({
        ...mockUpdatedConcept,
        name: 'Partially Updated Name',
      });

      const result = await controller.update('concept-123', partialUpdateDto, mockRequest);

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        partialUpdateDto,
        'admin-123'
      );
      expect(result.name).toBe('Partially Updated Name');
    });

    it('should handle concept not found error', async () => {
      const error = new NotFoundException('Concept with ID concept-999 not found.');
      mockConceptsService.updateConcept.mockRejectedValue(error);

      await expect(
        controller.update('concept-999', validUpdateConceptDto, mockRequest)
      ).rejects.toThrow('Concept with ID concept-999 not found.');

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-999',
        validUpdateConceptDto,
        'admin-123'
      );
    });

    it('should handle parent concept not found error', async () => {
      const error = new NotFoundException('Parent concept with ID invalid-parent-123 does not exist.');
      mockConceptsService.updateConcept.mockRejectedValue(error);

      const updateDtoWithInvalidParent: UpdateConceptDto = {
        name: 'Updated Concept',
        parentId: 'invalid-parent-123',
      };

      await expect(
        controller.update('concept-123', updateDtoWithInvalidParent, mockRequest)
      ).rejects.toThrow('Parent concept with ID invalid-parent-123 does not exist.');
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockConceptsService.updateConcept.mockRejectedValue(error);

      await expect(
        controller.update('concept-123', validUpdateConceptDto, mockRequest)
      ).rejects.toThrow('Database connection failed');
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

      mockConceptsService.updateConcept.mockResolvedValue(mockUpdatedConcept);

      await controller.update('concept-123', validUpdateConceptDto, requestWithDifferentAdminId);

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        validUpdateConceptDto,
        'admin-999'
      );
    });

    it('should handle removing parent relationship', async () => {
      const removeParentDto: UpdateConceptDto = {
        name: 'Updated Name',
        parentId: '', // Empty string to remove parent
      };

      mockConceptsService.updateConcept.mockResolvedValue(mockUpdatedConcept);

      const result = await controller.update('concept-123', removeParentDto, mockRequest);

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        removeParentDto,
        'admin-123'
      );
      expect(result).toEqual(mockUpdatedConcept);
    });
  });

  describe('POST /concepts/:id/prerequisites', () => {
    const mockRequest = {
      user: { id: 'admin-123', role: ['admin'] }
    } as any;

    const validPrerequisiteDto = {
      prerequisiteId: 'prerequisite-123'
    };

    const mockSuccessResponse = {
      message: 'Prerequisite relationship created successfully'
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully create a prerequisite relationship', async () => {
      mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(mockSuccessResponse);

      const result = await controller.createPrerequisite('concept-123', validPrerequisiteDto, mockRequest);

      expect(conceptsService.createPrerequisiteRelationship).toHaveBeenCalledWith(
        'concept-123',
        'prerequisite-123',
        'admin-123'
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw BadRequestException when concept ID is empty', async () => {
      await expect(
        controller.createPrerequisite('', validPrerequisiteDto, mockRequest)
      ).rejects.toThrow('Concept ID cannot be empty');

      expect(conceptsService.createPrerequisiteRelationship).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when concept ID is whitespace only', async () => {
      await expect(
        controller.createPrerequisite('   ', validPrerequisiteDto, mockRequest)
      ).rejects.toThrow('Concept ID cannot be empty');

      expect(conceptsService.createPrerequisiteRelationship).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      const serviceError = new NotFoundException('Concept with ID concept-123 not found.');
      mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(serviceError);

      await expect(
        controller.createPrerequisite('concept-123', validPrerequisiteDto, mockRequest)
      ).rejects.toThrow(serviceError);

      expect(conceptsService.createPrerequisiteRelationship).toHaveBeenCalledWith(
        'concept-123',
        'prerequisite-123',
        'admin-123'
      );
    });

    it('should call service with correct parameters for different admin', async () => {
      const requestWithDifferentAdmin = {
        user: { id: 'admin-999', role: ['admin'] }
      } as any;

      mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(mockSuccessResponse);

      await controller.createPrerequisite('concept-456', validPrerequisiteDto, requestWithDifferentAdmin);

      expect(conceptsService.createPrerequisiteRelationship).toHaveBeenCalledWith(
        'concept-456',
        'prerequisite-123',
        'admin-999'
      );
    });
  });
});
