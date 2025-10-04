/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { Neo4jModule } from '../common/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}