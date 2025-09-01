import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface DatabaseConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface SetupConfig {
  database: DatabaseConfig;
  seeding: {
    enabled: boolean;
    dropExisting: boolean;
    seedData: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableQueryLogging: boolean;
  };
}

export function createSetupConfig(): SetupConfig {
  return {
    database: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
      database: process.env.NEO4J_DATABASE,
    },
    seeding: {
      enabled: true,
      dropExisting: process.env.DROP_EXISTING_DATA === 'true',
      seedData: process.env.SEED_DATA !== 'false',
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
    },
  };
}