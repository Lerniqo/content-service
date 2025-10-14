/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

// Mock neo4j driver
jest.mock('neo4j-driver');

describe('Neo4jService', () => {
  let service: Neo4jService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<PinoLogger>;
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: jest.Mocked<Session>;

  beforeEach(async () => {
    // Create mocked dependencies
    mockDriver = {
      getServerInfo: jest.fn(),
      close: jest.fn(),
      session: jest.fn(),
    } as any;

    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    logger = {
      setContext: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock the neo4j driver creation
    (neo4j.driver as jest.Mock).mockReturnValue(mockDriver);
    (neo4j.auth.basic as jest.Mock) = jest.fn().mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Neo4jService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: PinoLogger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<Neo4jService>(Neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set logger context', () => {
      expect(logger.setContext).toHaveBeenCalledWith('Neo4jService');
    });

    it('should create driver with configuration values', () => {
      configService.get.mockImplementation((key: string) => {
        const config = {
          NEO4J_URI: 'bolt://test:7687',
          NEO4J_USERNAME: 'testuser',
          NEO4J_PASSWORD: 'testpass',
        };
        return config[key];
      });

      // Create new service instance to test constructor
      new Neo4jService(logger, configService);

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://test:7687',
        expect.anything(),
      );
      expect(neo4j.auth.basic).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('should use default values when config is not provided', () => {
      configService.get.mockReturnValue(undefined);

      // Create new service instance to test constructor
      new Neo4jService(logger, configService);

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.anything(),
      );
      expect(neo4j.auth.basic).toHaveBeenCalledWith('neo4j', 'password');
    });
  });

  describe('onModuleInit', () => {
    it('should connect to Neo4j successfully', async () => {
      const serverInfo = { address: 'localhost:7687', version: '4.4.0' };
      mockDriver.getServerInfo.mockResolvedValue(serverInfo);

      await service.onModuleInit();

      expect(mockDriver.getServerInfo).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        `Connected to Neo4j: ${serverInfo}`,
      );
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      mockDriver.getServerInfo.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to connect to Neo4j',
        error,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close driver connection', async () => {
      mockDriver.close.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockDriver.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Neo4j driver closed');
    });
  });

  describe('read', () => {
    beforeEach(() => {
      mockDriver.session.mockReturnValue(mockSession);
    });

    it('should execute read query successfully', async () => {
      const mockRecords = [
        { toObject: () => ({ id: 1, name: 'Test' }) },
        { toObject: () => ({ id: 2, name: 'Test2' }) },
      ];
      const mockResult = { records: mockRecords };
      mockSession.run.mockResolvedValue(mockResult as any);

      const cypher = 'MATCH (n) RETURN n';
      const params = { limit: 10 };

      const result = await service.read(cypher, params);

      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledWith(cypher, params);
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 1, name: 'Test' },
        { id: 2, name: 'Test2' },
      ]);
    });

    it('should execute read query without params', async () => {
      const mockRecords = [{ toObject: () => ({ count: 5 }) }];
      const mockResult = { records: mockRecords };
      mockSession.run.mockResolvedValue(mockResult as any);

      const cypher = 'MATCH (n) RETURN count(n) as count';

      const result = await service.read(cypher);

      expect(mockSession.run).toHaveBeenCalledWith(cypher, undefined);
      expect(result).toEqual([{ count: 5 }]);
    });

    it('should handle query execution error', async () => {
      const error = new Error('Query failed');
      mockSession.run.mockRejectedValue(error);

      const cypher = 'INVALID QUERY';

      await expect(service.read(cypher)).rejects.toThrow('Query failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to execute Cypher query',
        error,
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if query fails', async () => {
      mockSession.run.mockRejectedValue(new Error('Query failed'));

      const cypher = 'MATCH (n) RETURN n';

      await expect(service.read(cypher)).rejects.toThrow();
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    beforeEach(() => {
      mockDriver.session.mockReturnValue(mockSession);
    });

    it('should execute write query successfully', async () => {
      const mockRecords = [{ toObject: () => ({ id: 1, name: 'Created' }) }];
      const mockResult = { records: mockRecords };
      mockSession.run.mockResolvedValue(mockResult as any);

      const cypher = 'CREATE (n:Person {name: $name}) RETURN n';
      const params = { name: 'John' };

      const result = await service.write(cypher, params);

      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledWith(cypher, params);
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Created' }]);
    });

    it('should execute write query without params', async () => {
      const mockRecords = [];
      const mockResult = { records: mockRecords };
      mockSession.run.mockResolvedValue(mockResult as any);

      const cypher = 'CREATE INDEX ON :Person(email)';

      const result = await service.write(cypher);

      expect(mockSession.run).toHaveBeenCalledWith(cypher, undefined);
      expect(result).toEqual([]);
    });

    it('should handle write query execution error', async () => {
      const error = new Error('Write failed');
      mockSession.run.mockRejectedValue(error);

      const cypher = 'CREATE (n:Person)';

      await expect(service.write(cypher)).rejects.toThrow('Write failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to execute Cypher query',
        error,
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if write query fails', async () => {
      mockSession.run.mockRejectedValue(new Error('Write failed'));

      const cypher = 'CREATE (n:Person)';

      await expect(service.write(cypher)).rejects.toThrow();
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
