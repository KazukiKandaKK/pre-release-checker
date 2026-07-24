import { schedule, ScheduledTask, validate } from 'node-cron';
import { prisma } from 'pre-release-checker-database';
import { getConfig } from './config.js';
import { enqueueCrawl, enqueueScenario } from './queue.js';

let currentTask: ScheduledTask | null = null;

export function startScheduler(): void {
  stopScheduler();
  void syncScheduler();
}

export function stopScheduler(): void {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}

export async function syncScheduler(): Promise<void> {
  stopScheduler();
  const config = await getConfig();
  if (!config || !config.scheduleEnabled || !config.scheduleCron) return;

  if (!validate(config.scheduleCron)) {
    console.error('Invalid cron expression:', config.scheduleCron);
    return;
  }

  currentTask = schedule(config.scheduleCron, async () => {
    console.log(`Scheduled job triggered: ${config.scheduleJobType}`);
    if (config.scheduleJobType === 'crawl') {
      const run = await prisma.run.create({
        data: {
          status: 'pending',
          baseUrl: config.baseUrl,
          configSnapshot: JSON.stringify(config),
        },
      });
      await enqueueCrawl(run.id, config.baseUrl, config);
    } else if (config.scheduleJobType === 'scenarios') {
      const scenarios = await prisma.scenario.findMany({ where: { status: 'active' } });
      for (const scenario of scenarios) {
        const scenarioRun = await prisma.scenarioRun.create({
          data: { scenarioId: scenario.id, status: 'pending' },
        });
        await enqueueScenario(scenarioRun.id, scenario.id, config);
      }
    }
  });

  console.log(`Scheduler started with cron "${config.scheduleCron}" for ${config.scheduleJobType}`);
}
