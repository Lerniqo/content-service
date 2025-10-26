import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
import { Neo4jModule } from '../common/neo4j/neo4j.module';
import { KafkaModule } from '../common/kafka/kafka.module';
import { LearningPathConsumer } from '../common/kafka/consumers/learning-path.consumer';
import { ProgressServiceClientModule } from '../common/clients/progress-service-client.module';

@Module({
  imports: [Neo4jModule, KafkaModule, ProgressServiceClientModule],
  controllers: [LearningPathController],
  providers: [LearningPathService],
  exports: [LearningPathService],
})
export class LearningPathModule implements OnModuleInit {
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    // Get instances from the module
    const learningPathService = this.moduleRef.get(LearningPathService, {
      strict: false,
    });
    const learningPathConsumer = this.moduleRef.get(LearningPathConsumer, {
      strict: false,
    });

    // Set the service in the consumer to avoid circular dependency
    if (learningPathConsumer) {
      learningPathConsumer.setLearningPathService(learningPathService);
    }
  }
}
