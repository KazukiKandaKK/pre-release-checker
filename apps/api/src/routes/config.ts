import { Router } from 'express';
import { configInputSchema } from 'pre-release-checker-shared';
import { getConfig, upsertConfig, redactConfig } from '../services/config.js';
import { syncScheduler } from '../services/scheduler.js';
import { validate } from '../middleware/validate.js';

export const configRouter = Router();

configRouter.get('/', async (_req, res, next) => {
  try {
    const cfg = await getConfig();
    if (!cfg) {
      res.status(404).json({ error: 'NotConfigured' });
      return;
    }
    res.json(redactConfig(cfg));
  } catch (err) {
    next(err);
  }
});

configRouter.post('/', validate(configInputSchema), async (req, res, next) => {
  try {
    const cfg = await upsertConfig(req.body);
    await syncScheduler();
    res.json(redactConfig(cfg));
  } catch (err) {
    next(err);
  }
});
