import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { apiEndpointInputSchema } from 'pre-release-checker-shared';
import type { ApiEndpointInput } from 'pre-release-checker-shared';
import { validate } from '../middleware/validate.js';

export const apiEndpointsRouter = Router();

apiEndpointsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.apiEndpoint.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

apiEndpointsRouter.post('/', validate(apiEndpointInputSchema), async (req, res, next) => {
  try {
    const input = req.body as ApiEndpointInput;
    const row = await prisma.apiEndpoint.create({
      data: {
        name: input.name,
        method: input.method,
        url: input.url,
        headers: input.headers || null,
        body: input.body || null,
        expectedStatus: input.expectedStatus ?? null,
        expectedContentType: input.expectedContentType || null,
        timeoutMs: input.timeoutMs,
      },
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

apiEndpointsRouter.put('/:id', validate(apiEndpointInputSchema), async (req, res, next) => {
  try {
    const input = req.body as ApiEndpointInput;
    const row = await prisma.apiEndpoint.update({
      where: { id: req.params.id },
      data: {
        name: input.name,
        method: input.method,
        url: input.url,
        headers: input.headers || null,
        body: input.body || null,
        expectedStatus: input.expectedStatus ?? null,
        expectedContentType: input.expectedContentType || null,
        timeoutMs: input.timeoutMs,
      },
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

apiEndpointsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.apiEndpoint.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
