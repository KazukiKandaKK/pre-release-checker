import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { LocalStorage } from 'pre-release-checker-storage';

export const runsRouter = Router();

const storage = new LocalStorage(process.env.STORAGE_LOCAL_PATH || '../../data/storage');

runsRouter.get('/', async (_req, res, next) => {
  try {
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        _count: { select: { pages: true } },
      },
    });
    res.json(runs);
  } catch (err) {
    next(err);
  }
});

runsRouter.get('/:id', async (req, res, next) => {
  try {
    const run = await prisma.run.findUnique({
      where: { id: req.params.id },
      include: { pages: true },
    });
    if (!run) {
      res.status(404).json({ error: 'RunNotFound' });
      return;
    }
    res.json(run);
  } catch (err) {
    next(err);
  }
});

runsRouter.get('/:id/pages', async (req, res, next) => {
  try {
    const pages = await prisma.page.findMany({
      where: { runId: req.params.id },
      orderBy: { visitedAt: 'asc' },
    });
    res.json(pages);
  } catch (err) {
    next(err);
  }
});

runsRouter.get('/:runId/pages/:pageId/screenshot', async (req, res, next) => {
  try {
    const data = await storage.getScreenshot(req.params.runId, req.params.pageId);
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
