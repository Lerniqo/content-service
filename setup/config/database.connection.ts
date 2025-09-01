import neo4j, { Driver, Session } from 'neo4j-driver';
import { DatabaseConfig } from './setup.config';

export class DatabaseConnection {
  private driver: Driver;

  constructor(private config: DatabaseConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
  }

  async connect(): Promise<void> {
    try {
      await this.driver.getServerInfo();
      console.log('✅ Connected to Neo4j database');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.driver.close();
      console.log('✅ Disconnected from Neo4j database');
    } catch (error) {
      console.error('❌ Error disconnecting from Neo4j database:', error);
    }
  }

  getSession(): Session {
    return this.driver.session();
  }

  async executeRead(cypher: string, params?: Record<string, any>): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.executeRead(tx => tx.run(cypher, params));
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async executeWrite(cypher: string, params?: Record<string, any>): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.executeWrite(tx => tx.run(cypher, params));
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const session = this.getSession();
      await session.run('RETURN 1 as test');
      await session.close();
      return true;
    } catch (error) {
      return false;
    }
  }
}
