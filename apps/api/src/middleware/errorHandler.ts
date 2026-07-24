import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: err.flatten() });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'InternalServerError', message: err.message ?? 'unknown error' });
};
