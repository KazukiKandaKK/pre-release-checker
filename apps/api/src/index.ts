import { config } from 'dotenv';
config({ path: '../../.env' });

import { app } from './app.js';
import { startScheduler } from './services/scheduler.js';

const port = Number(process.env.API_PORT) || 3001;

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
  startScheduler();
});
