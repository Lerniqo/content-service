import { Module } from '@nestjs/common';
import { ConceptsService } from './concepts.service';
import { ConceptsController } from './concepts.controller';

@Module({
  providers: [ConceptsService],
  controllers: [ConceptsController]
})
export class ConceptsModule {}
