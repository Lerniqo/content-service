/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';
import { Neo4jModule } from '../common/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [SyllabusController],
  providers: [SyllabusService],
  exports: [SyllabusService],
})
export class SyllabusModule {}