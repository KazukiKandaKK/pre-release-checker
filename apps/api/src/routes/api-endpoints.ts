import { Router } from 'express';
import { prisma } from 'pre-release-checker-database';
import { apiEndpointInputSchema, openapiImportSchema } from 'pre-release-checker-shared';
import type { ApiEndpointInput, OpenApiImportInput } from 'pre-release-checker-shared';
import { validate } from '../middleware/validate.js';
import { parseOpenApiSpec } from '../services/openapi.js';

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

apiEndpointsRouter.post('/import-openapi', validate(openapiImportSchema), async (req, res, next) => {
  try {
    const input = req.body as OpenApiImportInput;
    const { baseUrl, endpoints } = parseOpenApiSpec(input.spec, input.baseUrl);

    const validEndpoints = endpoints.filter((ep) => apiEndpointInputSchema.safeParse(ep).success);

    if (input.dryRun) {
      res.json({ count: validEndpoints.length, baseUrl, endpoints: validEndpoints });
      return;
    }

    const created = await Promise.all(
      validEndpoints.map((ep) =>
        prisma.apiEndpoint.create({
          data: {
            name: ep.name,
            method: ep.method,
            url: ep.url,
            headers: ep.headers || null,
            body: ep.body || null,
            expectedStatus: ep.expectedStatus ?? null,
            expectedContentType: ep.expectedContentType || null,
            timeoutMs: ep.timeoutMs,
          },
        })
      )
    );

    res.status(201).json({ count: created.length, baseUrl, endpoints: created });
  } catch (err) {
    next(err);
  }
});
