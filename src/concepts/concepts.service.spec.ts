import { Test, TestingModule } from '@nestjs/testing';
import { ConceptsService } from './concepts.service';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { Logger } from 'nestjs-pino';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('ConceptsService', () => {
  let service: ConceptsService;
  let neo4jService: Neo4jService;
  let logger: Logger;

  const mockSession = {
    beginTransaction: jest.fn(),
    close: jest.fn(),
  };

  const mockTransaction = {
    run: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockNeo4jService = {
    getSession: jest.fn(() => mockSession),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ConceptsService>(ConceptsService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
    logger = module.get<Logger>(Logger);

    // Reset mocks
    jest.clearAllMocks();
    mockSession.beginTransaction.mockReturnValue(mockTransaction);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPrerequisiteRelationship', () => {
    const conceptId = 'concept-123';
    const prerequisiteId = 'prerequisite-456';
    const adminId = 'admin-789';

    it('should successfully create a prerequisite relationship', async () => {
      // Mock concept exists
      mockTransaction.run
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // concept exists
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // prerequisite exists
        .mockResolvedValueOnce({ records: [] }) // no existing relationship
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }); // relationship created

      const result = await service.createPrerequisiteRelationship(
        conceptId,
        prerequisiteId,
        adminId,
      );

      expect(result).toEqual({
        message: 'Prerequisite relationship created successfully',
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw BadRequestException when concept ID is empty', async () => {
      await expect(
        service.createPrerequisiteRelationship('', prerequisiteId, adminId),
      ).rejects.toThrow(BadRequestException);
      expect(mockTransaction.run).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when prerequisite ID is empty', async () => {
      await expect(
        service.createPrerequisiteRelationship(conceptId, '', adminId),
      ).rejects.toThrow(BadRequestException);
      expect(mockTransaction.run).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when concept does not exist', async () => {
      mockTransaction.run.mockResolvedValueOnce({ records: [] }); // concept does not exist

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw NotFoundException when prerequisite concept does not exist', async () => {
      mockTransaction.run
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // concept exists
        .mockResolvedValueOnce({ records: [] }); // prerequisite does not exist

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw BadRequestException when relationship already exists', async () => {
      mockTransaction.run
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // concept exists
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // prerequisite exists
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }); // relationship exists

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when relationship creation fails', async () => {
      mockTransaction.run
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // concept exists
        .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // prerequisite exists
        .mockResolvedValueOnce({ records: [] }) // no existing relationship
        .mockResolvedValueOnce({ records: [] }); // relationship creation fails

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockTransaction.run.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle session closing even on error', async () => {
      mockTransaction.run.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createPrerequisiteRelationship(
          conceptId,
          prerequisiteId,
          adminId,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
