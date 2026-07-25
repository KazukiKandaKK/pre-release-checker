import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';

export const runsRouter = Router();

function parseJsonField(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

runsRouter.get('/', async (_req, res, next) => {
  try {
    const runs = await prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { pages: true } } },
    });
    res.json(runs.map((run) => ({ ...run, findings: parseJsonField(run.findings) })));
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
    res.json({
      ...run,
      configSnapshot: parseJsonField(run.configSnapshot),
      findings: parseJsonField(run.findings),
      pages: run.pages.map((page) => ({
        ...page,
        consoleLogs: parseJsonField(page.consoleLogs),
      })),
    });
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
    res.json(pages.map((page) => ({ ...page, consoleLogs: parseJsonField(page.consoleLogs) })));
  } catch (err) {
    next(err);
  }
});

runsRouter.get('/:runId/pages/:pageId/screenshot', async (req, res, next) => {
  try {
    const page = await prisma.page.findUnique({
      where: { id: req.params.pageId },
      select: { screenshotPath: true },
    });
    if (!page || !page.screenshotPath) {
      res.status(404).json({ error: 'ScreenshotNotFound' });
      return;
    }
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(page.screenshotPath);
    res.setHeader('Content-Type', 'image/png');
    res.send(data);
  } catch (err) {
    next(err);
  }
});

runsRouter.get('/:runId/pages/:pageId/diff', async (req, res, next) => {
  try {
    const page = await prisma.page.findUnique({ where: { id: req.params.pageId } });
    if (!page || !page.diffPath) {
      res.status(404).json({ error: 'DiffNotFound' });
      return;
    }
    const fs = await import('node:fs/promises');
    const data = await fs.readFile(page.diffPath);
    res.setHeader('Content-Type', 'image/png');
    res.send(data);
  } catch (err) {
    next(err);
  }
});
