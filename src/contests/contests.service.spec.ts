/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ContestsService } from './contests.service';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { TaskType } from './dto/create-task.dto';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-12345'),
}));

describe('ContestsService', () => {
  let service: ContestsService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContestsService,
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

    service = module.get<ContestsService>(ContestsService);
    neo4jService = module.get<Neo4jService>(Neo4jService);

    // Clear mocks before each test
    jest.clearAllMocks();

    // Reset mock implementations
    mockNeo4jService.read.mockReset();
    mockNeo4jService.write.mockReset();
  });

  describe('createContest', () => {
    it('should create a contest successfully', async () => {
      // Arrange
      const createContestDto: CreateContestDto = {
        contestName: 'Math Championship',
        subTitle: 'Test your math skills',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-30T23:59:59Z',
        tasks: [
          {
            title: 'Complete 5 battles',
            type: TaskType.ONE_VS_ONE,
            description: 'Win 5 one-on-one battles',
            goal: 5,
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue({
        records: [{ get: () => 'test-uuid-12345' }],
      });

      // Act
      const result = await service.createContest(createContestDto);

      // Assert
      expect(result).toEqual({
        contestId: 'test-uuid-12345',
        message: 'Contest created successfully',
      });
      expect(neo4jService.write).toHaveBeenCalled();
    });

    it('should throw BadRequestException if start date is after end date', async () => {
      // Arrange
      const createContestDto: CreateContestDto = {
        contestName: 'Invalid Contest',
        startDate: '2025-11-30T00:00:00Z',
        endDate: '2025-11-01T00:00:00Z',
        tasks: [
          {
            title: 'Task',
            type: TaskType.ONE_VS_ONE,
            description: 'Description',
            goal: 5,
          },
        ],
      };

      // Act & Assert
      await expect(service.createContest(createContestDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if start date equals end date', async () => {
      // Arrange
      const createContestDto: CreateContestDto = {
        contestName: 'Invalid Contest',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-01T00:00:00Z',
        tasks: [
          {
            title: 'Task',
            type: TaskType.ONE_VS_ONE,
            description: 'Description',
            goal: 5,
          },
        ],
      };

      // Act & Assert
      await expect(service.createContest(createContestDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllContests', () => {
    it('should return all contests with tasks', async () => {
      // Arrange
      const mockRecords = [
        {
          contestId: 'contest-1',
          contestName: 'Contest 1',
          subTitle: 'Subtitle 1',
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2025-11-30T23:59:59Z',
          createdAt: '2025-10-01T10:00:00Z',
          updatedAt: '2025-10-01T10:00:00Z',
          tasks: [
            {
              taskId: 'task-1',
              title: 'Task 1',
              type: '1Vs1_tasks',
              description: 'Description 1',
              goal: 5,
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockRecords);

      // Act
      const result = await service.getAllContests();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].contestId).toBe('contest-1');
      expect(result[0].tasks).toHaveLength(1);
      expect(neo4jService.read).toHaveBeenCalled();
    });

    it('should return empty array when no contests exist', async () => {
      // Arrange
      mockNeo4jService.read.mockResolvedValue([]);

      // Act
      const result = await service.getAllContests();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getContestById', () => {
    it('should return contest by ID', async () => {
      // Arrange
      const contestId = 'contest-123';
      const mockRecords = [
        {
          contestId: 'contest-123',
          contestName: 'Test Contest',
          subTitle: 'Test Subtitle',
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2025-11-30T23:59:59Z',
          createdAt: '2025-10-01T10:00:00Z',
          updatedAt: '2025-10-01T10:00:00Z',
          tasks: [
            {
              taskId: 'task-1',
              title: 'Task 1',
              type: '1Vs1_tasks',
              description: 'Description 1',
              goal: 5,
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockRecords);

      // Act
      const result = await service.getContestById(contestId);

      // Assert
      expect(result.contestId).toBe('contest-123');
      expect(result.contestName).toBe('Test Contest');
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (c:Contest {contestId: $contestId})'),
        { contestId },
      );
    });

    it('should throw NotFoundException when contest does not exist', async () => {
      // Arrange
      const contestId = 'nonexistent-contest';
      mockNeo4jService.read.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getContestById(contestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle contest with no tasks', async () => {
      // Arrange
      const contestId = 'contest-no-tasks';
      const mockRecords = [
        {
          contestId: 'contest-no-tasks',
          contestName: 'Empty Contest',
          subTitle: null,
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2025-11-30T23:59:59Z',
          createdAt: '2025-10-01T10:00:00Z',
          updatedAt: '2025-10-01T10:00:00Z',
          tasks: [
            {
              taskId: null,
              title: null,
              type: null,
              description: null,
              goal: null,
            },
          ],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockRecords);

      // Act
      const result = await service.getContestById(contestId);

      // Assert
      expect(result.tasks).toEqual([]);
      expect(result.contestId).toBe('contest-no-tasks');
    });
  });

  describe('getAvailableContests', () => {
    it('should return contests that have not started yet', async () => {
      // Arrange
      const mockRecords = [
        {
          contestId: 'future-contest',
          contestName: 'Future Contest',
          subTitle: 'Coming soon',
          startDate: '2025-12-01T00:00:00Z',
          endDate: '2025-12-31T23:59:59Z',
          createdAt: '2025-10-01T10:00:00Z',
          updatedAt: '2025-10-01T10:00:00Z',
          tasks: [],
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockRecords);

      // Act
      const result = await service.getAvailableContests();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].contestId).toBe('future-contest');
      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.startDate > $now'),
        expect.any(Object),
      );
    });
  });

  describe('updateContest', () => {
    it('should update contest successfully', async () => {
      // Arrange
      const contestId = 'contest-123';
      const updateDto: UpdateContestDto = {
        contestName: 'Updated Contest Name',
      };

      // Mock getContestById to return existing contest
      const mockExistingContest = {
        contestId: 'contest-123',
        contestName: 'Old Name',
        subTitle: 'Subtitle',
        startDate: '2025-11-01T00:00:00Z',
        endDate: '2025-11-30T23:59:59Z',
        tasks: [],
        createdAt: '2025-10-01T10:00:00Z',
        updatedAt: '2025-10-01T10:00:00Z',
      };

      jest
        .spyOn(service, 'getContestById')
        .mockResolvedValue(mockExistingContest);

      mockNeo4jService.write.mockResolvedValue({
        records: [{ get: () => 'contest-123' }],
      });

      // Act
      await service.updateContest(contestId, updateDto);

      // Assert
      expect(service.getContestById).toHaveBeenCalledWith(contestId);
      expect(neo4jService.write).toHaveBeenCalled();
    });

    it('should throw BadRequestException when updating with invalid dates', async () => {
      // Arrange
      const contestId = 'contest-123';
      const updateDto: UpdateContestDto = {
        startDate: '2025-11-30T00:00:00Z',
        endDate: '2025-11-01T00:00:00Z',
      };

      // Act & Assert
      await expect(service.updateContest(contestId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteContest', () => {
    it('should delete contest successfully', async () => {
      // Arrange
      const contestId = 'contest-123';
      mockNeo4jService.write.mockResolvedValue([
        { deletedCount: { toNumber: () => 1 } },
      ]);

      // Act
      const result = await service.deleteContest(contestId);

      // Assert
      expect(result).toEqual({ message: 'Contest deleted successfully' });
      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('DELETE r, t, c'),
        { contestId },
      );
    });

    it('should throw NotFoundException when contest does not exist', async () => {
      // Arrange
      const contestId = 'nonexistent-contest';
      mockNeo4jService.write.mockResolvedValue([
        { deletedCount: { toNumber: () => 0 } },
      ]);

      // Act & Assert
      await expect(service.deleteContest(contestId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('canParticipate', () => {
    it('should allow participation when contest has not started', async () => {
      // Arrange
      const contestId = 'future-contest';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockContest = {
        contestId: 'future-contest',
        contestName: 'Future Contest',
        startDate: futureDate.toISOString(),
        endDate: '2025-12-31T23:59:59Z',
        tasks: [],
      };

      jest.spyOn(service, 'getContestById').mockResolvedValue(mockContest);

      // Act
      const result = await service.canParticipate(contestId);

      // Assert
      expect(result.canParticipate).toBe(true);
      expect(result.message).toBe('You can participate in this contest.');
    });

    it('should not allow participation when contest has started', async () => {
      // Arrange
      const contestId = 'started-contest';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockContest = {
        contestId: 'started-contest',
        contestName: 'Started Contest',
        startDate: pastDate.toISOString(),
        endDate: '2025-12-31T23:59:59Z',
        tasks: [],
      };

      jest.spyOn(service, 'getContestById').mockResolvedValue(mockContest);

      // Act
      const result = await service.canParticipate(contestId);

      // Assert
      expect(result.canParticipate).toBe(false);
      expect(result.message).toBe(
        'Contest has already started. Participation is not allowed.',
      );
    });
  });
});
