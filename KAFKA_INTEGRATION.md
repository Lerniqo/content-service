# Kafka Integration Guide

This document explains how to use the Kafka integration in the content service.

## Overview

The Kafka integration provides:
- **Producer capabilities**: Send events when content is created, updated, or deleted
- **Consumer capabilities**: Listen for student progress events and other system events
- **Auto-retry mechanisms**: Built-in retry logic for failed message processing
- **Logging**: Comprehensive logging for debugging and monitoring

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following Kafka-related variables:

```bash
# Basic Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=content-service

# Connection Settings
KAFKA_CONNECTION_TIMEOUT=3000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_INITIAL_RETRY_TIME=100
KAFKA_RETRIES=8

# Production SSL Configuration (optional)
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
```

## Starting Kafka with Docker Compose

The `docker-compose.yml` includes Kafka and Zookeeper services:

```bash
# Start all services including Kafka
docker-compose up -d

# Check if Kafka is healthy
docker-compose ps
```

## Usage Examples

### 1. Producing Events

Inject the `ContentEventProducer` service to send events:

```typescript
import { Injectable } from '@nestjs/common';
import { ContentEventProducer } from '../common/kafka/producers/content-event.producer';

@Injectable()
export class QuizService {
  constructor(
    private readonly contentEventProducer: ContentEventProducer,
  ) {}

  async createQuiz(quizData: any, userId: string): Promise<any> {
    // Create quiz logic here...
    const quiz = await this.saveQuiz(quizData);

    // Publish event
    await this.contentEventProducer.publishContentCreated(
      'quiz',
      quiz.id,
      userId,
      { title: quiz.title, difficulty: quiz.difficulty }
    );

    return quiz;
  }

  async submitQuiz(quizId: string, studentId: string, answers: any): Promise<any> {
    // Process submission...
    const result = await this.processSubmission(quizId, studentId, answers);

    // Publish quiz submission event
    await this.contentEventProducer.publishQuizSubmission(
      quizId,
      studentId,
      result.score,
      answers,
      result.completionTime
    );

    return result;
  }
}
```

### 2. Direct Kafka Service Usage

For more advanced use cases, inject the `KafkaService` directly:

```typescript
import { Injectable } from '@nestjs/common';
import { KafkaService } from '../common/kafka/kafka.service';

@Injectable()
export class CustomService {
  constructor(private readonly kafkaService: KafkaService) {}

  async sendCustomEvent(): Promise<void> {
    await this.kafkaService.sendMessage({
      topic: 'custom.topic',
      key: 'event-key',
      value: JSON.stringify({ data: 'custom event data' }),
      headers: {
        'source': 'content-service',
        'version': '1.0',
      },
    });
  }

  async sendBatchEvents(): Promise<void> {
    const messages = [
      {
        topic: 'batch.topic',
        key: 'key1',
        value: JSON.stringify({ id: 1, data: 'first event' }),
      },
      {
        topic: 'batch.topic', 
        key: 'key2',
        value: JSON.stringify({ id: 2, data: 'second event' }),
      },
    ];

    await this.kafkaService.sendMessages(messages);
  }
}
```

### 3. Creating Custom Consumers

Create custom consumers by extending the pattern:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService, MessageHandler } from '../common/kafka/kafka.service';
import { EachMessagePayload } from 'kafkajs';

@Injectable()
export class CustomConsumer implements OnModuleInit {
  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit() {
    await this.kafkaService.subscribe(
      ['custom.topic'],
      {
        groupId: 'custom-consumer-group',
        sessionTimeout: 30000,
      },
      this.handleMessage.bind(this),
    );
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;
    const data = JSON.parse(message.value?.toString() || '{}');
    
    console.log(`Received message from ${topic}:`, data);
    // Process your message here
  }
}
```

## Topics and Event Schema

### Content Events
- **Topics**: `content.{type}.{action}` (e.g., `content.quiz.created`)
- **Schema**:
  ```json
  {
    "eventType": "created|updated|deleted",
    "contentType": "quiz|question|resource|concept",
    "contentId": "string",
    "userId": "string", 
    "timestamp": "ISO8601",
    "metadata": {}
  }
  ```

### Student Progress Events
- **Topics**: `student.knowledge.updated`, `quiz.submission`
- **Schema**:
  ```json
  {
    "eventType": "knowledge_updated|quiz_submitted",
    "studentId": "string",
    "conceptId": "string", 
    "timestamp": "ISO8601",
    // ... other fields
  }
  ```

## Testing

### Manual Testing with Kafka CLI Tools

```bash
# Enter Kafka container
docker-compose exec kafka bash

# Create a test topic
kafka-topics --create --topic test-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

# Produce a message
echo '{"test": "message"}' | kafka-console-producer --topic test-topic --bootstrap-server localhost:9092

# Consume messages
kafka-console-consumer --topic test-topic --from-beginning --bootstrap-server localhost:9092
```

### Integration Tests

```typescript
describe('Kafka Integration', () => {
  let kafkaService: KafkaService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [KafkaModule.forRootAsync()],
    }).compile();
    
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  it('should send and receive messages', async () => {
    const testMessage = { test: 'data' };
    
    await kafkaService.sendMessage({
      topic: 'test-topic',
      value: JSON.stringify(testMessage),
    });
    
    // Assert message was sent successfully
  });
});
```

## Monitoring and Debugging

### Logs

The Kafka integration uses structured logging. Check logs for:
- Connection status
- Message production/consumption
- Error handling
- Retry attempts

### Health Checks

```typescript
// Check if producer is connected
const isConnected = kafkaService.isProducerConnected();

// Get active consumer groups
const consumerGroups = kafkaService.getActiveConsumerGroups();
```

## Production Considerations

1. **SSL/SASL**: Configure authentication for production
2. **Topic Management**: Pre-create topics with appropriate partitions
3. **Consumer Groups**: Use descriptive group IDs
4. **Error Handling**: Implement dead letter queues for failed messages
5. **Monitoring**: Set up metrics and alerting
6. **Resource Limits**: Configure appropriate timeouts and batch sizes

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if Kafka is running and accessible
2. **Authentication errors**: Verify SASL credentials
3. **Consumer lag**: Monitor consumer group lag and scale consumers
4. **Message serialization**: Ensure proper JSON serialization

### Useful Commands

```bash
# List all topics
kafka-topics --list --bootstrap-server localhost:9092

# Describe consumer groups
kafka-consumer-groups --describe --group content-service-consumer-group --bootstrap-server localhost:9092

# Check topic details
kafka-topics --describe --topic content.quiz.created --bootstrap-server localhost:9092
```