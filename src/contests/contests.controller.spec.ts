/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { PinoLogger } from 'nestjs-pino';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { TaskType } from './dto/create-task.dto';

describe('ContestsController', () => {
  let controller: ContestsController;
  let service: ContestsService;

  const mockContestsService = {
    createContest: jest.fn(),
    getAllContests: jest.fn(),
    getContestById: jest.fn(),
    getAvailableContests: jest.fn(),
    updateContest: jest.fn(),
    deleteContest: jest.fn(),
    canParticipate: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      role: ['teacher'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContestsController],
      providers: [
        {
          provide: ContestsService,
          useValue: mockContestsService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ContestsController>(ContestsController);
    service = module.get<ContestsService>(ContestsService);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('createContest', () => {
    it('should create a contest', async () => {
      // Arrange
      const createDto: CreateContestDto = {
        contestName: 'Math Championship',
        subTitle: 'Test your skills',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-30T23:59:59Z',
        tasks: [
          {
            title: 'Complete battles',
            type: TaskType.ONE_VS_ONE,
            description: 'Win battles',
            goal: 5,
          },
        ],
      };

      const expectedResult = {
        contestId: 'contest-123',
        message: 'Contest created successfully',
      };

      mockContestsService.createContest.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createContest(createDto, mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.createContest).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getAllContests', () => {
    it('should return all contests', async () => {
      // Arrange
      const expectedResult = [
        {
          contestId: 'contest-1',
          contestName: 'Contest 1',
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2025-11-30T23:59:59Z',
          tasks: [],
        },
      ];

      mockContestsService.getAllContests.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getAllContests(mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getAllContests).toHaveBeenCalled();
    });
  });

  describe('getAvailableContests', () => {
    it('should return available contests', async () => {
      // Arrange
      const expectedResult = [
        {
          contestId: 'future-contest',
          contestName: 'Future Contest',
          startDate: '2025-12-01T00:00:00Z',
          endDate: '2025-12-31T23:59:59Z',
          tasks: [],
        },
      ];

      mockContestsService.getAvailableContests.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getAvailableContests(mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getAvailableContests).toHaveBeenCalled();
    });
  });

  describe('getContestById', () => {
    it('should return contest by ID', async () => {
      // Arrange
      const contestId = 'contest-123';
      const expectedResult = {
        contestId: 'contest-123',
        contestName: 'Test Contest',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-30T23:59:59Z',
        tasks: [],
      };

      mockContestsService.getContestById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getContestById(contestId, mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.getContestById).toHaveBeenCalledWith(contestId);
    });
  });

  describe('canParticipate', () => {
    it('should check participation eligibility', async () => {
      // Arrange
      const contestId = 'contest-123';
      const expectedResult = {
        canParticipate: true,
        message: 'You can participate in this contest.',
      };

      mockContestsService.canParticipate.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.canParticipate(contestId, mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.canParticipate).toHaveBeenCalledWith(contestId);
    });
  });

  describe('updateContest', () => {
    it('should update a contest', async () => {
      // Arrange
      const contestId = 'contest-123';
      const updateDto: UpdateContestDto = {
        contestName: 'Updated Name',
      };

      const expectedResult = {
        contestId: 'contest-123',
        contestName: 'Updated Name',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-30T23:59:59Z',
        tasks: [],
      };

      mockContestsService.updateContest.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.updateContest(
        contestId,
        updateDto,
        mockRequest as any,
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.updateContest).toHaveBeenCalledWith(contestId, updateDto);
    });
  });

  describe('deleteContest', () => {
    it('should delete a contest', async () => {
      // Arrange
      const contestId = 'contest-123';
      const expectedResult = {
        message: 'Contest deleted successfully',
      };

      mockContestsService.deleteContest.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.deleteContest(contestId, mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(service.deleteContest).toHaveBeenCalledWith(contestId);
    });
  });
});
