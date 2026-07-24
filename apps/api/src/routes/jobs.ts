import { Router } from 'express';
import { createRunSchema, runStatusSchema } from 'pre-release-checker-shared';
import { prisma } from 'pre-release-checker-database';
import { getConfig } from '../services/config.js';
import { enqueueCrawl, getCrawlQueue } from '../services/queue.js';
import { validate } from '../middleware/validate.js';
import { Job } from 'bullmq';

export const jobsRouter = Router();

jobsRouter.post('/crawl', validate(createRunSchema), async (req, res, next) => {
  try {
    const config = await getConfig();
    if (!config) {
      res.status(400).json({ error: 'ConfigRequired', message: '先に設定を保存してください' });
      return;
    }

    const run = await prisma.run.create({
      data: {
        status: runStatusSchema.Enum.pending,
        baseUrl: req.body.baseUrl,
        configSnapshot: JSON.stringify(config),
      },
    });

    const jobId = await enqueueCrawl(run.id, req.body.baseUrl, config);
    res.json({ runId: run.id, jobId });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const job = await Job.fromId(getCrawlQueue(), req.params.id);
    if (!job) {
      res.status(404).json({ error: 'JobNotFound' });
      return;
    }
    res.json({
      id: job.id,
      name: job.name,
      data: job.data,
      status: await job.getState(),
      progress: job.progress,
    });
  } catch (err) {
    next(err);
  }
});
