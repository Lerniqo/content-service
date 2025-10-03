import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';
import { PinoLogger } from 'nestjs-pino';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { CreatePrerequisiteDto } from './dto/create-prerequisite.dto';
import {
  ExecutionContext,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerUtil } from '../common/utils/logger.util';

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
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    setContext: jest.fn(),
  };

  // Spy on LoggerUtil methods
  const loggerUtilSpy = {
    logInfo: jest.spyOn(LoggerUtil, 'logInfo'),
    logWarn: jest.spyOn(LoggerUtil, 'logWarn'),
    logError: jest.spyOn(LoggerUtil, 'logError'),
    logDebug: jest.spyOn(LoggerUtil, 'logDebug'),
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
    // Clear LoggerUtil spies
    Object.values(loggerUtilSpy).forEach((spy) => spy.mockClear());
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

      const result = await controller.create(
        validCreateConceptDto,
        mockRequest,
      );

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123',
      );
      expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
        expect.any(Object),
        'ConceptsController',
        'Creating concept',
        {
          conceptId: validCreateConceptDto.id,
          name: validCreateConceptDto.name,
          type: validCreateConceptDto.type,
          parentId: validCreateConceptDto.parentId,
          adminId: 'admin-123',
        },
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
        'admin-123',
      );
      expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
        expect.any(Object),
        'ConceptsController',
        'Creating concept',
        {
          conceptId: conceptWithoutParent.id,
          name: conceptWithoutParent.name,
          type: conceptWithoutParent.type,
          parentId: conceptWithoutParent.parentId,
          adminId: 'admin-123',
        },
      );
      expect(result).toEqual(mockCreatedConcept);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest),
      ).rejects.toThrow('Database connection failed');

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123',
      );
      expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
        expect.any(Object),
        'ConceptsController',
        'Creating concept',
        {
          conceptId: validCreateConceptDto.id,
          name: validCreateConceptDto.name,
          type: validCreateConceptDto.type,
          parentId: validCreateConceptDto.parentId,
          adminId: 'admin-123',
        },
      );
    });

    it('should handle concept already exists error', async () => {
      const error = new Error('Concept with ID concept-123 already exists.');
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest),
      ).rejects.toThrow('Concept with ID concept-123 already exists.');

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123',
      );
    });

    it('should handle parent concept not found error', async () => {
      const error = new Error(
        'Parent concept with ID parent-concept-456 does not exist.',
      );
      mockConceptsService.createConcept.mockRejectedValue(error);

      await expect(
        controller.create(validCreateConceptDto, mockRequest),
      ).rejects.toThrow(
        'Parent concept with ID parent-concept-456 does not exist.',
      );

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-123',
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

      await controller.create(
        validCreateConceptDto,
        requestWithDifferentAdminId,
      );

      expect(conceptsService.createConcept).toHaveBeenCalledWith(
        validCreateConceptDto,
        'admin-999',
      );
      expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
        expect.any(Object),
        'ConceptsController',
        'Creating concept',
        {
          conceptId: validCreateConceptDto.id,
          name: validCreateConceptDto.name,
          type: validCreateConceptDto.type,
          parentId: validCreateConceptDto.parentId,
          adminId: 'admin-999',
        },
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

      expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
        expect.any(Object),
        'ConceptsController',
        'Creating concept',
        {
          conceptId: detailedConceptDto.id,
          name: detailedConceptDto.name,
          type: detailedConceptDto.type,
          parentId: detailedConceptDto.parentId,
          adminId: 'admin-123',
        },
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

    it('should require admin role for createPrerequisite method', () => {
      const roles = Reflect.getMetadata('roles', controller.createPrerequisite);
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

      const result = await controller.update(
        'concept-123',
        validUpdateConceptDto,
        mockRequest,
      );

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        validUpdateConceptDto,
        'admin-123',
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

      const result = await controller.update(
        'concept-123',
        partialUpdateDto,
        mockRequest,
      );

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        partialUpdateDto,
        'admin-123',
      );
      expect(result.name).toBe('Partially Updated Name');
    });

    it('should handle concept not found error', async () => {
      const error = new NotFoundException(
        'Concept with ID concept-999 not found.',
      );
      mockConceptsService.updateConcept.mockRejectedValue(error);

      await expect(
        controller.update('concept-999', validUpdateConceptDto, mockRequest),
      ).rejects.toThrow('Concept with ID concept-999 not found.');

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-999',
        validUpdateConceptDto,
        'admin-123',
      );
    });

    it('should handle parent concept not found error', async () => {
      const error = new NotFoundException(
        'Parent concept with ID invalid-parent-123 does not exist.',
      );
      mockConceptsService.updateConcept.mockRejectedValue(error);

      const updateDtoWithInvalidParent: UpdateConceptDto = {
        name: 'Updated Concept',
        parentId: 'invalid-parent-123',
      };

      await expect(
        controller.update(
          'concept-123',
          updateDtoWithInvalidParent,
          mockRequest,
        ),
      ).rejects.toThrow(
        'Parent concept with ID invalid-parent-123 does not exist.',
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockConceptsService.updateConcept.mockRejectedValue(error);

      await expect(
        controller.update('concept-123', validUpdateConceptDto, mockRequest),
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

      await controller.update(
        'concept-123',
        validUpdateConceptDto,
        requestWithDifferentAdminId,
      );

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        validUpdateConceptDto,
        'admin-999',
      );
    });

    it('should handle removing parent relationship', async () => {
      const removeParentDto: UpdateConceptDto = {
        name: 'Updated Name',
        parentId: '', // Empty string to remove parent
      };

      mockConceptsService.updateConcept.mockResolvedValue(mockUpdatedConcept);

      const result = await controller.update(
        'concept-123',
        removeParentDto,
        mockRequest,
      );

      expect(conceptsService.updateConcept).toHaveBeenCalledWith(
        'concept-123',
        removeParentDto,
        'admin-123',
      );
      expect(result).toEqual(mockUpdatedConcept);
    });
  });

  describe('POST /concepts/:id/prerequisites', () => {
    const mockRequest = {
      user: { id: 'admin-123', role: ['admin'] },
    } as any;

    const validPrerequisiteDto: CreatePrerequisiteDto = {
      prerequisiteId: 'prerequisite-123',
    };

    const mockSuccessResponse = {
      message: 'Prerequisite relationship created successfully',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      Object.values(loggerUtilSpy).forEach((spy) => spy.mockClear());
    });

    describe('Successful prerequisite creation', () => {
      it('should successfully create a prerequisite relationship', async () => {
        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        const result = await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          mockRequest,
        );

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith('concept-123', 'prerequisite-123', 'admin-123');
        expect(result).toEqual(mockSuccessResponse);
      });

      it('should log prerequisite creation request', async () => {
        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          mockRequest,
        );

        expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Creating prerequisite relationship',
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should log successful prerequisite creation', async () => {
        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          mockRequest,
        );

        expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Prerequisite relationship created successfully',
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should call service with correct parameters for different admin', async () => {
        const requestWithDifferentAdmin = {
          user: { id: 'admin-999', role: ['admin'] },
        } as any;

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        await controller.createPrerequisite(
          'concept-456',
          validPrerequisiteDto,
          requestWithDifferentAdmin,
        );

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith('concept-456', 'prerequisite-123', 'admin-999');

        expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Creating prerequisite relationship',
          {
            conceptId: 'concept-456',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-999',
          },
        );
      });

      it('should handle different prerequisite IDs', async () => {
        const customPrerequisiteDto: CreatePrerequisiteDto = {
          prerequisiteId: 'custom-prerequisite-456',
        };

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        const result = await controller.createPrerequisite(
          'concept-789',
          customPrerequisiteDto,
          mockRequest,
        );

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith(
          'concept-789',
          'custom-prerequisite-456',
          'admin-123',
        );
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('Input validation', () => {
      it('should throw BadRequestException when concept ID is empty', async () => {
        await expect(
          controller.createPrerequisite('', validPrerequisiteDto, mockRequest),
        ).rejects.toThrow(BadRequestException);

        await expect(
          controller.createPrerequisite('', validPrerequisiteDto, mockRequest),
        ).rejects.toThrow('Concept ID cannot be empty');

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when concept ID is whitespace only', async () => {
        await expect(
          controller.createPrerequisite(
            '   ',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          controller.createPrerequisite(
            '   ',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow('Concept ID cannot be empty');

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when concept ID is undefined/null', async () => {
        await expect(
          controller.createPrerequisite(
            null as any,
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          controller.createPrerequisite(
            undefined as any,
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).not.toHaveBeenCalled();
      });

      it('should accept valid concept IDs with various formats', async () => {
        const validIds = [
          'concept-123',
          'CONCEPT_456',
          'concept.789',
          'concept@test',
          '123-concept-test',
        ];

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        for (const conceptId of validIds) {
          await controller.createPrerequisite(
            conceptId,
            validPrerequisiteDto,
            mockRequest,
          );

          expect(
            conceptsService.createPrerequisiteRelationship,
          ).toHaveBeenCalledWith(conceptId, 'prerequisite-123', 'admin-123');
        }

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledTimes(validIds.length);
      });
    });

    describe('Error handling and logging', () => {
      it('should handle and log NotFoundException from service', async () => {
        const notFoundError = new NotFoundException(
          'Concept with ID concept-123 not found.',
        );
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          notFoundError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(NotFoundException);

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow('Concept with ID concept-123 not found.');

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          notFoundError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should handle and log prerequisite concept not found error', async () => {
        const prerequisiteNotFoundError = new NotFoundException(
          'Prerequisite concept with ID prerequisite-123 not found.',
        );
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          prerequisiteNotFoundError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(NotFoundException);

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          prerequisiteNotFoundError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should handle and log BadRequestException for duplicate relationship', async () => {
        const duplicateError = new BadRequestException(
          'Prerequisite relationship already exists between concept-123 and prerequisite-123.',
        );
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          duplicateError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(
          'Prerequisite relationship already exists between concept-123 and prerequisite-123.',
        );

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          duplicateError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should handle and log BadRequestException for circular dependency', async () => {
        const circularError = new BadRequestException(
          'Creating this prerequisite would result in a circular dependency.',
        );
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          circularError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          circularError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should handle and log generic service errors', async () => {
        const genericError = new Error('Database connection failed');
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          genericError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow('Database connection failed');

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          genericError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should handle and log internal server errors', async () => {
        const internalError = new Error('Neo4j connection timeout');
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          internalError,
        );

        await expect(
          controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          ),
        ).rejects.toThrow('Neo4j connection timeout');

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith('concept-123', 'prerequisite-123', 'admin-123');

        expect(loggerUtilSpy.logError).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Failed to create prerequisite relationship',
          internalError,
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-123',
          },
        );
      });

      it('should propagate error after logging', async () => {
        const customError = new Error('Custom service error');
        mockConceptsService.createPrerequisiteRelationship.mockRejectedValue(
          customError,
        );

        let caughtError: any;
        try {
          await controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            mockRequest,
          );
        } catch (error) {
          caughtError = error;
        }

        expect(caughtError).toBe(customError);
        expect(loggerUtilSpy.logError).toHaveBeenCalled();
      });
    });

    describe('Authentication and authorization context', () => {
      it('should extract admin ID from complex user object', async () => {
        const complexUserRequest = {
          user: {
            id: 'admin-complex-123',
            role: ['admin', 'user'],
            email: 'admin@example.com',
            name: 'Admin User',
            permissions: ['create', 'read', 'update', 'delete'],
          },
        } as any;

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          complexUserRequest,
        );

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith(
          'concept-123',
          'prerequisite-123',
          'admin-complex-123',
        );

        expect(loggerUtilSpy.logInfo).toHaveBeenCalledWith(
          expect.any(Object),
          'ConceptsController',
          'Creating prerequisite relationship',
          {
            conceptId: 'concept-123',
            prerequisiteId: 'prerequisite-123',
            adminId: 'admin-complex-123',
          },
        );
      });

      it('should handle different admin ID formats', async () => {
        const adminIdFormats = [
          'admin-123',
          'ADMIN_456',
          'admin.test@domain.com',
          '00000000-0000-0000-0000-000000000000',
          'admin-user-789-test',
        ];

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        for (const adminId of adminIdFormats) {
          const requestWithCustomAdminId = {
            user: { id: adminId, role: ['admin'] },
          } as any;

          await controller.createPrerequisite(
            'concept-123',
            validPrerequisiteDto,
            requestWithCustomAdminId,
          );

          expect(
            conceptsService.createPrerequisiteRelationship,
          ).toHaveBeenCalledWith('concept-123', 'prerequisite-123', adminId);
        }
      });
    });

    describe('Endpoint behavior verification', () => {
      it('should call service method with exact parameters', async () => {
        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          mockSuccessResponse,
        );

        await controller.createPrerequisite(
          'test-concept',
          validPrerequisiteDto,
          mockRequest,
        );

        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledTimes(1);
        expect(
          conceptsService.createPrerequisiteRelationship,
        ).toHaveBeenCalledWith('test-concept', 'prerequisite-123', 'admin-123');
      });

      it('should return service response unchanged', async () => {
        const customResponse = {
          message: 'Prerequisite relationship created successfully',
          relationshipId: 'rel-123',
          createdAt: new Date().toISOString(),
        };

        mockConceptsService.createPrerequisiteRelationship.mockResolvedValue(
          customResponse,
        );

        const result = await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          mockRequest,
        );

        expect(result).toEqual(customResponse);
        expect(result).toBe(customResponse); // Should be exact same object reference
      });

      it('should handle async operation correctly', async () => {
        // Simulate async delay
        mockConceptsService.createPrerequisiteRelationship.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(mockSuccessResponse), 10),
            ),
        );

        const startTime = Date.now();
        const result = await controller.createPrerequisite(
          'concept-123',
          validPrerequisiteDto,
          mockRequest,
        );
        const endTime = Date.now();

        expect(endTime - startTime).toBeGreaterThanOrEqual(10);
        expect(result).toEqual(mockSuccessResponse);
      });
    });
  });
});
