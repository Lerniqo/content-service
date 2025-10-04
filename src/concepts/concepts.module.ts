import { Module } from '@nestjs/common';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';
import { Neo4jModule } from '../common/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [ConceptsController],
  providers: [ConceptsService],
  exports: [ConceptsService],
})
export class ConceptsModule {}
