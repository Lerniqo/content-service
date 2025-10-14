/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, LoggerModule } from 'nestjs-pino';
import { Neo4jService } from './neo4j.service';
import { Neo4jModule } from './neo4j.module';

describe('Neo4jService Integration', () => {
  let service: Neo4jService;
  let module: TestingModule;

  // Integration tests with real Neo4j database
  describe('Integration Tests with Real Database', () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            pinoHttp: {
              level: 'silent', // Disable logging in tests
            },
          }),
          Neo4jModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: jest.fn().mockImplementation((key: string) => {
            const config: Record<string, string> = {
              NEO4J_URI:
                process.env.NEO4J_URI ||
                'neo4j+s://7e6f4ad1.databases.neo4j.io',
              NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
              NEO4J_PASSWORD:
                process.env.NEO4J_PASSWORD ||
                'aVhFUcZeF0Jy-EWYAyTzcsHt-vrdWEJYyVYpi3ErF90',
            };
            return config[key];
          }),
        })
        .compile();

      service = module.get<Neo4jService>(Neo4jService);

      // Initialize the service
      await service.onModuleInit();
    });

    afterAll(async () => {
      if (service) await service.onModuleDestroy();
      if (module) await module.close();
    });

    beforeEach(async () => {
      // Clean up test data
      await service.write('MATCH (n:TestNode) DETACH DELETE n');
    });

    it('should connect to Neo4j database', async () => {
      const result: any[] = await service.read(
        'RETURN "Hello Neo4j" as message',
      );
      expect(result).toEqual([{ message: 'Hello Neo4j' }]);
    });

    it('should create and read nodes', async () => {
      const createResult = await service.write(
        'CREATE (n:TestNode {name: $name, id: $id}) RETURN n',
        { name: 'Integration Test', id: 1 },
      );

      expect(createResult).toHaveLength(1);
      expect(createResult[0].n.properties.name).toBe('Integration Test');

      const readResult = await service.read(
        'MATCH (n:TestNode {id: $id}) RETURN n',
        { id: 1 },
      );

      expect(readResult).toHaveLength(1);
      expect(readResult[0].n.properties.name).toBe('Integration Test');
    });

    it('should handle multiple operations', async () => {
      await service.write(
        'CREATE (n1:TestNode {name: $name1, id: $id1}), (n2:TestNode {name: $name2, id: $id2})',
        { name1: 'Node 1', id1: 1, name2: 'Node 2', id2: 2 },
      );

      const countResult: any[] = await service.read(
        'MATCH (n:TestNode) RETURN count(n) as count',
      );

      // Neo4j returns count as Neo4j Integer object, convert to number
      const count = countResult[0].count;
      const actualCount =
        typeof count === 'object' && count.toNumber ? count.toNumber() : count;
      expect(actualCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex queries', async () => {
      await service.write(`
        CREATE (p1:Person {name: 'Alice', id: 1})
        CREATE (p2:Person {name: 'Bob', id: 2})
        CREATE (p1)-[:KNOWS]->(p2)
        RETURN p1, p2
      `);

      const result = await service.read(`
        MATCH (p1:Person)-[:KNOWS]->(p2:Person)
        RETURN p1.name as person1, p2.name as person2
      `);

      expect(result).toHaveLength(1);
      expect(result[0].person1).toBe('Alice');
      expect(result[0].person2).toBe('Bob');

      await service.write('MATCH (p:Person) DETACH DELETE p');
    });

    it('should handle transactions properly', async () => {
      try {
        await service.write('INVALID CYPHER QUERY');
      } catch {
        // Expected error - invalid query should fail
      }

      // Database should still be accessible after failed transaction
      const result: any[] = await service.read(
        'RETURN "Database OK" as status',
      );
      expect(result[0].status).toBe('Database OK');
    });
  });

  // Mocked tests without real database
  describe('Mocked Integration Tests', () => {
    let mockConfigService: Partial<ConfigService>;
    let mockLogger: Partial<PinoLogger>;

    beforeEach(async () => {
      mockLogger = {
        setContext: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            NEO4J_URI: 'bolt://test:7687',
            NEO4J_USERNAME: 'testuser',
            NEO4J_PASSWORD: 'testpass',
          };
          return config[key];
        }),
      };

      module = await Test.createTestingModule({
        providers: [
          Neo4jService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: PinoLogger, useValue: mockLogger },
        ],
      }).compile();

      service = module.get<Neo4jService>(Neo4jService);
    });

    afterEach(async () => {
      if (module) await module.close();
    });

    it('should be properly configured with dependencies', () => {
      expect(service).toBeDefined();
      expect(mockLogger.setContext).toHaveBeenCalledWith('Neo4jService');
    });

    it('should use configuration values from ConfigService', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_URI');
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_USERNAME');
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_PASSWORD');
    });
  });
});
