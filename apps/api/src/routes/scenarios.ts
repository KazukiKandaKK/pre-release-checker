import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { scenarioInputSchema, scenarioRunStatusSchema } from 'pre-release-checker-shared';
import { getConfig } from '../services/config.js';
import { enqueueScenario } from '../services/queue.js';
import { validate } from '../middleware/validate.js';

export const scenariosRouter = Router();

scenariosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.scenario.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows.map((r) => ({ ...r, steps: JSON.parse(r.steps) })));
  } catch (err) {
    next(err);
  }
});

scenariosRouter.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!row) {
      res.status(404).json({ error: 'ScenarioNotFound' });
      return;
    }
    res.json({ ...row, steps: JSON.parse(row.steps) });
  } catch (err) {
    next(err);
  }
});

scenariosRouter.post('/', validate(scenarioInputSchema), async (req, res, next) => {
  try {
    const row = await prisma.scenario.create({
      data: {
        ...req.body,
        source: 'manual',
        steps: JSON.stringify(req.body.steps),
      },
    });
    res.json({ ...row, steps: JSON.parse(row.steps) });
  } catch (err) {
    next(err);
  }
});

scenariosRouter.post('/:id/run', async (req, res, next) => {
  try {
    const config = await getConfig();
    if (!config) {
      res.status(400).json({ error: 'ConfigRequired', message: '先に設定を保存してください' });
      return;
    }

    const scenario = await prisma.scenario.findUnique({ where: { id: req.params.id } });
    if (!scenario) {
      res.status(404).json({ error: 'ScenarioNotFound' });
      return;
    }

    if (scenario.status !== 'active') {
      res.status(400).json({ error: 'ScenarioDisabled' });
      return;
    }

    const run = await prisma.scenarioRun.create({
      data: {
        scenarioId: scenario.id,
        status: scenarioRunStatusSchema.Enum.pending,
      },
    });

    const jobId = await enqueueScenario(run.id, scenario.id, config);
    res.json({ scenarioRunId: run.id, jobId });
  } catch (err) {
    next(err);
  }
});
