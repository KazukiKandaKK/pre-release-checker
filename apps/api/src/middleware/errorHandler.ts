import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const flat = err.flatten();
    const messages = Object.entries(flat.fieldErrors)
      .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
      .join('; ');
    res.status(400).json({ error: 'ValidationError', message: messages || '入力内容を確認してください', details: flat });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'InternalServerError', message: err.message ?? 'unknown error' });
};
