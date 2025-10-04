/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { LoggerUtil } from '../utils/logger.util';

@Injectable()
export class Neo4jService {
  private driver: Driver;
  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(Neo4jService.name);
    const uri = this.configService.get<string>('NEO4J_URI');
    const username = this.configService.get<string>('NEO4J_USERNAME');
    const password = this.configService.get<string>('NEO4J_PASSWORD');

    if (!uri || !username || !password) {
      throw new Error(
        'Neo4j credentials not found in environment variables. Please set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in your .env file.'
      );
    }

    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
    );
  }


  async onModuleInit() {
    try {
      const info = await this.driver.getServerInfo();
      LoggerUtil.logInfo(
        this.logger,
        'Neo4jService',
        'Connected to Neo4j database',
        {
          address: info.address,
          version: info.agent,
          uri: this.configService.get<string>('NEO4J_URI'),
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'Neo4jService',
        'Failed to connect to Neo4j database',
        error,
        { uri: this.configService.get<string>('NEO4J_URI') },
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.driver.close();
      LoggerUtil.logInfo(
        this.logger,
        'Neo4jService',
        'Neo4j driver closed successfully',
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'Neo4jService',
        'Error closing Neo4j driver',
        error,
      );
    }
  }

  getSession(): Session {
    const session = this.driver.session();
    LoggerUtil.logDebug(
      this.logger,
      'Neo4jService',
      'Created new database session',
    );
    return session;
  }

  async read(cypher: string, params?: Record<string, any>): Promise<any> {
    const session = this.getSession();
    const startTime = Date.now();

    try {
      LoggerUtil.logDebug(this.logger, 'Neo4jService', 'Executing read query', {
        query: cypher.substring(0, 100) + (cypher.length > 100 ? '...' : ''),
        params,
      });

      const result = await session.executeRead((tx) => tx.run(cypher, params));
      const records = result.records.map((record) => record.toObject());
      const duration = Date.now() - startTime;

      LoggerUtil.logDebug(
        this.logger,
        'Neo4jService',
        'Read query completed successfully',
        { recordCount: records.length, duration: `${duration}ms` },
      );

      return records;
    } catch (error) {
      const duration = Date.now() - startTime;
      LoggerUtil.logError(
        this.logger,
        'Neo4jService',
        'Read query failed',
        error,
        {
          query: cypher.substring(0, 100) + (cypher.length > 100 ? '...' : ''),
          params,
          duration: `${duration}ms`,
        },
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  async write(cypher: string, params?: Record<string, any>): Promise<any> {
    const session = this.getSession();
    const startTime = Date.now();

    try {
      LoggerUtil.logDebug(
        this.logger,
        'Neo4jService',
        'Executing write query',
        {
          query: cypher.substring(0, 100) + (cypher.length > 100 ? '...' : ''),
          params,
        },
      );

      const result = await session.executeWrite((tx) => tx.run(cypher, params));
      const records = result.records.map((record) => record.toObject());
      const duration = Date.now() - startTime;

      LoggerUtil.logInfo(
        this.logger,
        'Neo4jService',
        'Write query completed successfully',
        { recordCount: records.length, duration: `${duration}ms` },
      );

      return records;
    } catch (error) {
      const duration = Date.now() - startTime;
      LoggerUtil.logError(
        this.logger,
        'Neo4jService',
        'Write query failed',
        error,
        {
          query: cypher.substring(0, 100) + (cypher.length > 100 ? '...' : ''),
          params,
          duration: `${duration}ms`,
        },
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
