import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  checkHealth(): string {
    const output = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'content-service',
    };
    return JSON.stringify(output);
  }
}
