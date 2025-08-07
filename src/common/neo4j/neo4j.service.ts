import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService {
    private driver: Driver;
    constructor(
        private readonly logger: PinoLogger,
        private readonly configService: ConfigService,
    ) {
        this.logger.setContext(Neo4jService.name);
        this.driver = neo4j.driver(
            this.configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687',
            neo4j.auth.basic(
                this.configService.get<string>('NEO4J_USERNAME') || 'neo4j',
                this.configService.get<string>('NEO4J_PASSWORD') || 'password',
            ),
        );
    }

    async onModuleInit() {
        try {
            const info = await this.driver.getServerInfo();
            this.logger.info(`Connected to Neo4j: ${info}`);
        } catch (error) {
            this.logger.error('Failed to connect to Neo4j', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.driver.close();
        this.logger.info('Neo4j driver closed');
    }

    async read(cypher: string, params?: Record<string, any>): Promise<any> {
        const session = this.driver.session();
        try {
            const result = await session.run(cypher, params);
            return result.records.map(record => record.toObject());
        } catch (error) {
            this.logger.error('Failed to execute Cypher query', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    async write(cypher: string, params?: Record<string, any>): Promise<any> {
        const session = this.driver.session();
        try {
            const result = await session.run(cypher, params);
            return result.records.map(record => record.toObject());
        } catch (error) {
            this.logger.error('Failed to execute Cypher query', error);
            throw error;
        } finally {
            await session.close();
        }
    }

}
