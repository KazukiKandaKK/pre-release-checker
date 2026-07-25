import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { apiTestRunStatusSchema } from 'pre-release-checker-shared';
import { enqueueApiTest } from '../services/queue.js';

export const apiTestRunsRouter = Router();

apiTestRunsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.apiTestRun.findMany({ orderBy: { startedAt: 'desc' } });
    res.json(rows.map((row) => ({
      ...row,
      endpoints: row.endpoints ? JSON.parse(row.endpoints) : [],
      results: row.results ? JSON.parse(row.results) : null,
      findings: row.findings ? JSON.parse(row.findings) : null,
    })));
  } catch (err) {
    next(err);
  }
});

apiTestRunsRouter.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.apiTestRun.findUnique({ where: { id: req.params.id } });
    if (!row) {
      res.status(404).json({ error: 'NotFound' });
      return;
    }
    res.json({
      ...row,
      endpoints: row.endpoints ? JSON.parse(row.endpoints) : [],
      results: row.results ? JSON.parse(row.results) : null,
      findings: row.findings ? JSON.parse(row.findings) : null,
    });
  } catch (err) {
    next(err);
  }
});

apiTestRunsRouter.post('/', async (_req, res, next) => {
  try {
    const endpoints = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: 'desc' } });
    if (endpoints.length === 0) {
      res.status(400).json({ error: 'NoEndpoints', message: '先に API エンドポイントを登録してください' });
      return;
    }
    const run = await prisma.apiTestRun.create({
      data: {
        status: apiTestRunStatusSchema.Enum.pending,
        endpoints: JSON.stringify(endpoints),
      },
    });
    const jobId = await enqueueApiTest(run.id, endpoints as unknown as any[]);
    res.json({ apiTestRunId: run.id, jobId });
  } catch (err) {
    next(err);
  }
});
