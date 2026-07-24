import { config } from 'dotenv';
config({ path: '../../.env' });

import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from 'pre-release-checker-database';
import { configSchema, CRAWL_JOB_NAME, runStatusSchema } from 'pre-release-checker-shared';
import type { Config } from 'pre-release-checker-shared';
import { runCrawl } from './crawler.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface CrawlJobData {
  runId: string;
  baseUrl: string;
  configSnapshot: Config;
}

async function main() {
  const worker = new Worker(
    CRAWL_JOB_NAME,
    async (job) => {
      const { runId, baseUrl, configSnapshot } = job.data as CrawlJobData;
      const parsedConfig = configSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(configSnapshot);

      await prisma.run.update({
        where: { id: runId },
        data: { status: runStatusSchema.Enum.running },
      });

      const result = await runCrawl(runId, baseUrl, parsedConfig);

      await prisma.run.update({
        where: { id: runId },
        data: {
          status: result.error ? runStatusSchema.Enum.failed : runStatusSchema.Enum.completed,
          finishedAt: new Date(),
        },
      });

      if (result.error) {
        throw new Error(result.error);
      }
    },
    { connection, concurrency: Number(process.env.RUNNER_CONCURRENCY) || 2 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  console.log(`Runner started for queue "${CRAWL_JOB_NAME}"`);
}

main().catch((err) => {
  console.error('Failed to start runner', err);
  process.exit(1);
});
