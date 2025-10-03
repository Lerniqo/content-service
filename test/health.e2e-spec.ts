import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health check status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          // The service returns a JSON string, so parse it
          const healthData = JSON.parse(res.text);
          expect(healthData).toHaveProperty('status');
          expect(healthData.status).toBe('ok');
          expect(healthData).toHaveProperty('service');
          expect(healthData.service).toBe('content-service');
        });
    });
  });

  describe('/health/readiness (GET)', () => {
    it('should return 404 as readiness endpoint does not exist', () => {
      return request(app.getHttpServer()).get('/health/readiness').expect(404);
    });
  });

  describe('/health/liveness (GET)', () => {
    it('should return 404 as liveness endpoint does not exist', () => {
      return request(app.getHttpServer()).get('/health/liveness').expect(404);
    });
  });
});
