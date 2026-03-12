import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

@Controller('health')
class TestHealthController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    return { status: 'ok', checks: { database: 'ok', redis: 'ok' } };
  }
}

@Module({
  controllers: [TestHealthController],
})
class TestE2eModule {}

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestE2eModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/health/live').expect(200);
  });

  it('GET /health/ready', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/health/ready').expect(200);
  });
});
