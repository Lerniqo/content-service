/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { CreateContestResponseDto } from './dto/create-contest-response.dto';
import { ContestResponseDto } from './dto/contest-response.dto';
import { TaskDto } from './dto/task.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

interface TaskData {
  taskId: string | null;
  title: string | null;
  type: string | null;
  description: string | null;
  goal: number | null;
}

interface ContestQueryResult {
  contestId: string;
  contestName: string;
  subTitle: string | null;
  startDate: string;
  endDate: string;
  createdAt: string | null;
  updatedAt: string | null;
  tasks: TaskData[];
}

@Injectable()
export class ContestsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ContestsService.name);
  }

  /**
   * Create a new contest (only for teachers)
   */
  async createContest(
    createContestDto: CreateContestDto,
  ): Promise<CreateContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Creating new contest',
      { contestName: createContestDto.contestName },
    );

    // Validate dates
    const startDate = new Date(createContestDto.startDate);
    const endDate = new Date(createContestDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const contestId = uuidv4();
    const now = new Date().toISOString();

    try {
      const query = `
        CREATE (c:Contest {
          contestId: $contestId,
          contestName: $contestName,
          subTitle: $subTitle,
          startDate: $startDate,
          endDate: $endDate,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        WITH c
        UNWIND $tasks AS task
        CREATE (t:Task {
          taskId: randomUUID(),
          title: task.title,
          type: task.type,
          description: task.description,
          goal: task.goal
        })
        CREATE (c)-[:HAS_TASK]->(t)
        RETURN c.contestId AS contestId
      `;

      const parameters = {
        contestId,
        contestName: createContestDto.contestName,
        subTitle: createContestDto.subTitle || null,
        startDate: createContestDto.startDate,
        endDate: createContestDto.endDate,
        createdAt: now,
        updatedAt: now,
        tasks: createContestDto.tasks,
      };

      await this.neo4jService.write(query, parameters);

      LoggerUtil.logInfo(
        this.logger,
        'ContestsService',
        'Contest created successfully',
        { contestId },
      );

      return {
        contestId,
        message: 'Contest created successfully',
      };
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to create contest',
        error as Error,
        { contestName: createContestDto.contestName },
      );
      throw new InternalServerErrorException('Failed to create contest');
    }
  }

  /**
   * Get all contests
   */
  async getAllContests(): Promise<ContestResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Fetching all contests',
    );

    try {
      const query = `
        MATCH (c:Contest)
        OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
        WITH c, COLLECT(t) AS tasks
        RETURN c.contestId AS contestId,
               c.contestName AS contestName,
               c.subTitle AS subTitle,
               c.startDate AS startDate,
               c.endDate AS endDate,
               c.createdAt AS createdAt,
               c.updatedAt AS updatedAt,
               [task IN tasks | {
                 taskId: task.taskId,
                 title: task.title,
                 type: task.type,
                 description: task.description,
                 goal: task.goal
               }] AS tasks
        ORDER BY c.startDate DESC
      `;

      const result = await this.neo4jService.read(query);

      return result.records.map((record) => {
        const contestData: ContestQueryResult = {
          contestId: record.get('contestId'),
          contestName: record.get('contestName'),
          subTitle: record.get('subTitle'),
          startDate: record.get('startDate'),
          endDate: record.get('endDate'),
          createdAt: record.get('createdAt'),
          updatedAt: record.get('updatedAt'),
          tasks: record.get('tasks'),
        };

        return this.mapToContestResponse(contestData);
      });
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to fetch contests',
        error as Error,
      );
      throw new InternalServerErrorException('Failed to fetch contests');
    }
  }

  /**
   * Get a single contest by ID
   */
  async getContestById(contestId: string): Promise<ContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Fetching contest by ID',
      { contestId },
    );

    try {
      const query = `
        MATCH (c:Contest {contestId: $contestId})
        OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
        WITH c, COLLECT(t) AS tasks
        RETURN c.contestId AS contestId,
               c.contestName AS contestName,
               c.subTitle AS subTitle,
               c.startDate AS startDate,
               c.endDate AS endDate,
               c.createdAt AS createdAt,
               c.updatedAt AS updatedAt,
               [task IN tasks | {
                 taskId: task.taskId,
                 title: task.title,
                 type: task.type,
                 description: task.description,
                 goal: task.goal
               }] AS tasks
      `;

      const result = await this.neo4jService.read(query, { contestId });

      if (result.records.length === 0) {
        throw new NotFoundException(`Contest with ID ${contestId} not found`);
      }

      const record = result.records[0];
      const contestData: ContestQueryResult = {
        contestId: record.get('contestId'),
        contestName: record.get('contestName'),
        subTitle: record.get('subTitle'),
        startDate: record.get('startDate'),
        endDate: record.get('endDate'),
        createdAt: record.get('createdAt'),
        updatedAt: record.get('updatedAt'),
        tasks: record.get('tasks'),
      };

      return this.mapToContestResponse(contestData);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to fetch contest',
        error as Error,
        { contestId },
      );
      throw new InternalServerErrorException('Failed to fetch contest');
    }
  }

  /**
   * Get available contests for students (contests that haven't started yet)
   */
  async getAvailableContests(): Promise<ContestResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Fetching available contests for participation',
    );

    const now = new Date().toISOString();

    try {
      const query = `
        MATCH (c:Contest)
        WHERE c.startDate > $now
        OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
        WITH c, COLLECT(t) AS tasks
        RETURN c.contestId AS contestId,
               c.contestName AS contestName,
               c.subTitle AS subTitle,
               c.startDate AS startDate,
               c.endDate AS endDate,
               c.createdAt AS createdAt,
               c.updatedAt AS updatedAt,
               [task IN tasks | {
                 taskId: task.taskId,
                 title: task.title,
                 type: task.type,
                 description: task.description,
                 goal: task.goal
               }] AS tasks
        ORDER BY c.startDate ASC
      `;

      const result = await this.neo4jService.read(query, { now });

      return result.records.map((record) => {
        const contestData: ContestQueryResult = {
          contestId: record.get('contestId'),
          contestName: record.get('contestName'),
          subTitle: record.get('subTitle'),
          startDate: record.get('startDate'),
          endDate: record.get('endDate'),
          createdAt: record.get('createdAt'),
          updatedAt: record.get('updatedAt'),
          tasks: record.get('tasks'),
        };

        return this.mapToContestResponse(contestData);
      });
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to fetch available contests',
        error as Error,
      );
      throw new InternalServerErrorException('Failed to fetch available contests');
    }
  }

  /**
   * Update a contest (only for teachers)
   */
  async updateContest(
    contestId: string,
    updateContestDto: UpdateContestDto,
  ): Promise<ContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Updating contest',
      { contestId },
    );

    // Validate dates if both are provided
    if (updateContestDto.startDate && updateContestDto.endDate) {
      const startDate = new Date(updateContestDto.startDate);
      const endDate = new Date(updateContestDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // Check if contest exists
    const existingContest = await this.getContestById(contestId);

    // Validate dates if only one is provided
    if (updateContestDto.startDate && !updateContestDto.endDate) {
      const startDate = new Date(updateContestDto.startDate);
      const endDate = new Date(existingContest.endDate);
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    if (!updateContestDto.startDate && updateContestDto.endDate) {
      const startDate = new Date(existingContest.startDate);
      const endDate = new Date(updateContestDto.endDate);
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    try {
      const now = new Date().toISOString();

      // Build the SET clause dynamically based on provided fields
      const setFields: string[] = ['c.updatedAt = $updatedAt'];
      const parameters: any = { contestId, updatedAt: now };

      if (updateContestDto.contestName !== undefined) {
        setFields.push('c.contestName = $contestName');
        parameters.contestName = updateContestDto.contestName;
      }

      if (updateContestDto.subTitle !== undefined) {
        setFields.push('c.subTitle = $subTitle');
        parameters.subTitle = updateContestDto.subTitle;
      }

      if (updateContestDto.startDate !== undefined) {
        setFields.push('c.startDate = $startDate');
        parameters.startDate = updateContestDto.startDate;
      }

      if (updateContestDto.endDate !== undefined) {
        setFields.push('c.endDate = $endDate');
        parameters.endDate = updateContestDto.endDate;
      }

      let query = `
        MATCH (c:Contest {contestId: $contestId})
        SET ${setFields.join(', ')}
      `;

      // If tasks are being updated, delete old tasks and create new ones
      if (updateContestDto.tasks) {
        query += `
          WITH c
          OPTIONAL MATCH (c)-[r:HAS_TASK]->(oldTask:Task)
          DELETE r, oldTask
          WITH c
          UNWIND $tasks AS task
          CREATE (t:Task {
            taskId: randomUUID(),
            title: task.title,
            type: task.type,
            description: task.description,
            goal: task.goal
          })
          CREATE (c)-[:HAS_TASK]->(t)
        `;
        parameters.tasks = updateContestDto.tasks;
      }

      query += ' RETURN c.contestId AS contestId';

      await this.neo4jService.write(query, parameters);

      LoggerUtil.logInfo(
        this.logger,
        'ContestsService',
        'Contest updated successfully',
        { contestId },
      );

      // Fetch and return the updated contest
      return await this.getContestById(contestId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to update contest',
        error as Error,
        { contestId },
      );
      throw new InternalServerErrorException('Failed to update contest');
    }
  }

  /**
   * Delete a contest (only for teachers)
   */
  async deleteContest(contestId: string): Promise<{ message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Deleting contest',
      { contestId },
    );

    try {
      const query = `
        MATCH (c:Contest {contestId: $contestId})
        OPTIONAL MATCH (c)-[r:HAS_TASK]->(t:Task)
        DELETE r, t, c
        RETURN count(c) AS deletedCount
      `;

      const result = await this.neo4jService.write(query, { contestId });

      const deletedCount = result.records[0]?.get('deletedCount')?.toNumber() || 0;

      if (deletedCount === 0) {
        throw new NotFoundException(`Contest with ID ${contestId} not found`);
      }

      LoggerUtil.logInfo(
        this.logger,
        'ContestsService',
        'Contest deleted successfully',
        { contestId },
      );

      return { message: 'Contest deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to delete contest',
        error as Error,
        { contestId },
      );
      throw new InternalServerErrorException('Failed to delete contest');
    }
  }

  /**
   * Check if a student can participate in a contest
   */
  async canParticipate(contestId: string): Promise<{ canParticipate: boolean; message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsService',
      'Checking participation eligibility',
      { contestId },
    );

    try {
      const contest = await this.getContestById(contestId);
      const now = new Date();
      const startDate = new Date(contest.startDate);

      if (now >= startDate) {
        return {
          canParticipate: false,
          message: 'Contest has already started. Participation is not allowed.',
        };
      }

      return {
        canParticipate: true,
        message: 'You can participate in this contest.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ContestsService',
        'Failed to check participation eligibility',
        error as Error,
        { contestId },
      );
      throw new InternalServerErrorException('Failed to check participation eligibility');
    }
  }

  /**
   * Map contest query result to response DTO
   */
  private mapToContestResponse(contestData: ContestQueryResult): ContestResponseDto {
    const tasks: TaskDto[] = contestData.tasks
      .filter((task) => task.taskId !== null)
      .map((task) => ({
        taskId: task.taskId!,
        title: task.title!,
        type: task.type!,
        description: task.description!,
        goal: task.goal!,
      }));

    return {
      contestId: contestData.contestId,
      contestName: contestData.contestName,
      subTitle: contestData.subTitle || undefined,
      startDate: contestData.startDate,
      endDate: contestData.endDate,
      tasks,
      createdAt: contestData.createdAt || undefined,
      updatedAt: contestData.updatedAt || undefined,
    };
  }
}
