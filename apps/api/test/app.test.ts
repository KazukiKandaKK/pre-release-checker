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

  it('POST /api/scenarios creates a scenario and GET /api/scenarios lists it', async () => {
    const payload = {
      name: 'Test scenario',
      description: 'Manual scenario',
      risk: 'safe',
      status: 'active',
      baseUrl: 'https://staging.example.com',
      pageUrl: 'https://staging.example.com/contact',
      steps: [{ type: 'navigate' as const, url: 'https://staging.example.com/contact' }],
    };

    const post = await request(app).post('/api/scenarios').send(payload);
    expect(post.status).toBe(200);
    expect(post.body.name).toBe(payload.name);
    expect(post.body.steps).toHaveLength(1);

    const get = await request(app).get('/api/scenarios');
    expect(get.status).toBe(200);
    expect(get.body.some((s: { id: string }) => s.id === post.body.id)).toBe(true);
  });

  it('GET /api/scenarios/:id returns a scenario', async () => {
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Find me',
        source: 'auto',
        risk: 'safe',
        status: 'active',
        baseUrl: 'https://staging.example.com',
        pageUrl: 'https://staging.example.com/',
        steps: JSON.stringify([{ type: 'navigate', url: 'https://staging.example.com/' }]),
      },
    });

    const res = await request(app).get(`/api/scenarios/${scenario.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Find me');
    expect(res.body.steps[0].type).toBe('navigate');
  });

  it('GET /api/scenario-runs/:id returns a scenario run', async () => {
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Run test',
        source: 'auto',
        risk: 'safe',
        status: 'active',
        baseUrl: 'https://staging.example.com',
        pageUrl: 'https://staging.example.com/',
        steps: JSON.stringify([{ type: 'navigate', url: 'https://staging.example.com/' }]),
      },
    });

    const scenarioRun = await prisma.scenarioRun.create({
      data: {
        scenarioId: scenario.id,
        status: 'completed',
        result: JSON.stringify({ scenarioId: scenario.id, stepResults: [], consoleLogs: [], hasJsError: false, hasHttpError: false }),
      },
    });

    const res = await request(app).get(`/api/scenario-runs/${scenarioRun.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.scenario.name).toBe('Run test');
  });
});
