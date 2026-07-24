import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { LocalStorage } from 'pre-release-checker-storage';

export const scenarioRunsRouter = Router();

const storage = new LocalStorage(process.env.STORAGE_LOCAL_PATH || '../../data/storage');

scenarioRunsRouter.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.scenarioRun.findUnique({
      where: { id: req.params.id },
      include: { scenario: true },
    });
    if (!row) {
      res.status(404).json({ error: 'ScenarioRunNotFound' });
      return;
    }
    res.json({
      ...row,
      result: row.result ? JSON.parse(row.result) : null,
      scenario: row.scenario ? { ...row.scenario, steps: JSON.parse(row.scenario.steps) } : null,
    });
  } catch (err) {
    next(err);
  }
});

scenarioRunsRouter.get('/:id/screenshots/:stepIndex', async (req, res, next) => {
  try {
    const data = await storage.getScreenshot(req.params.id, req.params.stepIndex);
    if (!data) {
      res.status(404).json({ error: 'ScreenshotNotFound' });
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(data);
  } catch (err) {
    next(err);
  }
});
