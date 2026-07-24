import cors from 'cors';
import express from 'express';
import { configRouter } from './routes/config.js';
import { jobsRouter } from './routes/jobs.js';
import { runsRouter } from './routes/runs.js';
import { scenariosRouter } from './routes/scenarios.js';
import { scenarioRunsRouter } from './routes/scenario-runs.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/config', configRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/scenario-runs', scenarioRunsRouter);

app.use(errorHandler);
