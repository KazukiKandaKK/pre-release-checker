import './setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from 'pre-release-checker-database';
import { app } from '../src/app.js';

describe('API', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/config saves and GET /api/config returns it', async () => {
    const payload = {
      baseUrl: 'https://staging.example.com',
      allowedOrigins: 'https://staging.example.com',
      maxDepth: 2,
      concurrency: 2,
      delayMs: 500,
      maxPages: 50,
      excludePatterns: '/logout',
    };

    const save = await request(app).post('/api/config').send(payload);
    expect(save.status).toBe(200);
    expect(save.body.baseUrl).toBe(payload.baseUrl);

    const get = await request(app).get('/api/config');
    expect(get.status).toBe(200);
    expect(get.body.baseUrl).toBe(payload.baseUrl);
  });

  it('POST /api/config rejects an invalid origin', async () => {
    const res = await request(app)
      .post('/api/config')
      .send({
        baseUrl: 'https://staging.example.com',
        allowedOrigins: 'not-valid',
      });
    expect(res.status).toBe(400);
  });
});
