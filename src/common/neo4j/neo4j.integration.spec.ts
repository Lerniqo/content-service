import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from './neo4j.service';
import { Neo4jModule } from './neo4j.module';

describe('Neo4jService Integration', () => {
  let service: Neo4jService;
  let module: TestingModule;

  // Skip these tests by default since they require a real Neo4j instance
  // Remove .skip to run with actual Neo4j database
  describe.skip('Integration Tests with Real Database', () => {
    beforeAll(async () => {
      // Mock logger for integration tests
      const mockLogger = {
        setContext: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      module = await Test.createTestingModule({
        imports: [Neo4jModule],
        providers: [
          {
            provide: PinoLogger,
            useValue: mockLogger,
          },
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          get: jest.fn().mockImplementation((key: string) => {
            const config = {
              'NEO4J_URI': process.env.NEO4J_URI || 'bolt://localhost:7687',
              'NEO4J_USERNAME': process.env.NEO4J_USERNAME || 'neo4j',
              'NEO4J_PASSWORD': process.env.NEO4J_PASSWORD || 'password',
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
      if (service) {
        await service.onModuleDestroy();
      }
      if (module) {
        await module.close();
      }
    });

    beforeEach(async () => {
      // Clean up test data before each test
      await service.write('MATCH (n:TestNode) DETACH DELETE n');
    });

    it('should connect to Neo4j database', async () => {
      // Test basic connectivity
      const result = await service.read('RETURN "Hello Neo4j" as message');
      expect(result).toEqual([{ message: 'Hello Neo4j' }]);
    });

    it('should create and read nodes', async () => {
      // Create a test node
      const createResult = await service.write(
        'CREATE (n:TestNode {name: $name, id: $id}) RETURN n',
        { name: 'Integration Test', id: 1 }
      );

      expect(createResult).toHaveLength(1);
      expect(createResult[0].n.properties.name).toBe('Integration Test');

      // Read the created node
      const readResult = await service.read(
        'MATCH (n:TestNode {id: $id}) RETURN n',
        { id: 1 }
      );

      expect(readResult).toHaveLength(1);
      expect(readResult[0].n.properties.name).toBe('Integration Test');
    });

    it('should handle multiple operations', async () => {
      // Create multiple nodes
      await service.write(
        'CREATE (n1:TestNode {name: $name1, id: $id1}), (n2:TestNode {name: $name2, id: $id2})',
        { name1: 'Node 1', id1: 1, name2: 'Node 2', id2: 2 }
      );

      // Count nodes
      const countResult = await service.read(
        'MATCH (n:TestNode) RETURN count(n) as count'
      );

      expect(countResult[0].count).toEqual(expect.any(Number));
      expect(countResult[0].count).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex queries', async () => {
      // Create nodes with relationships
      await service.write(`
        CREATE (p1:Person {name: 'Alice', id: 1})
        CREATE (p2:Person {name: 'Bob', id: 2})
        CREATE (p1)-[:KNOWS]->(p2)
        RETURN p1, p2
      `);

      // Query relationships
      const result = await service.read(`
        MATCH (p1:Person)-[:KNOWS]->(p2:Person)
        RETURN p1.name as person1, p2.name as person2
      `);

      expect(result).toHaveLength(1);
      expect(result[0].person1).toBe('Alice');
      expect(result[0].person2).toBe('Bob');

      // Clean up
      await service.write('MATCH (p:Person) DETACH DELETE p');
    });

    it('should handle transactions properly', async () => {
      // Test that failed queries don't affect database state
      try {
        await service.write('INVALID CYPHER QUERY');
      } catch (error) {
        // Expected to fail
      }

      // Verify database is still functional
      const result = await service.read('RETURN "Database OK" as status');
      expect(result[0].status).toBe('Database OK');
    });
  });

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
          const config = {
            'NEO4J_URI': 'bolt://test:7687',
            'NEO4J_USERNAME': 'testuser',
            'NEO4J_PASSWORD': 'testpass',
          };
          return config[key];
        }),
      };

      module = await Test.createTestingModule({
        providers: [
          Neo4jService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: PinoLogger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      service = module.get<Neo4jService>(Neo4jService);
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
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
