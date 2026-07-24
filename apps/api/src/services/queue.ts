import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { CRAWL_JOB_NAME } from 'pre-release-checker-shared';
import type { Config } from 'pre-release-checker-shared';

function getRedis() {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

let crawlQueue: Queue | null = null;
export function getCrawlQueue(): Queue {
  if (!crawlQueue) {
    crawlQueue = new Queue(CRAWL_JOB_NAME, { connection: getRedis() });
  }
  return crawlQueue;
}

export interface CrawlJobData {
  runId: string;
  baseUrl: string;
  configSnapshot: Config;
}

export async function enqueueCrawl(runId: string, baseUrl: string, configSnapshot: Config) {
  const job = await getCrawlQueue().add(CRAWL_JOB_NAME, {
    runId,
    baseUrl,
    configSnapshot,
  } as CrawlJobData);
  return job.id;
}
