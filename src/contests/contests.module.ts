/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { Neo4jModule } from '../common/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [ContestsController],
  providers: [ContestsService],
  exports: [ContestsService],
})
export class ContestsModule {}
