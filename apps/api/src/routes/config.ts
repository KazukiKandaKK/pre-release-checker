import { Router } from 'express';
import { configInputSchema } from 'pre-release-checker-shared';
import { getConfig, upsertConfig } from '../services/config.js';
import { validate } from '../middleware/validate.js';

export const configRouter = Router();

configRouter.get('/', async (_req, res, next) => {
  try {
    const cfg = await getConfig();
    if (!cfg) {
      res.status(404).json({ error: 'NotConfigured' });
      return;
    }
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});

configRouter.post('/', validate(configInputSchema), async (req, res, next) => {
  try {
    const cfg = await upsertConfig(req.body);
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});
