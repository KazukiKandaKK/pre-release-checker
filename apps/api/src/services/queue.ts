import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { API_TEST_JOB_NAME, CRAWL_JOB_NAME, SCENARIO_JOB_NAME } from 'pre-release-checker-shared';
import type { Config, ApiEndpoint } from 'pre-release-checker-shared';

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

let scenarioQueue: Queue | null = null;
export function getScenarioQueue(): Queue {
  if (!scenarioQueue) {
    scenarioQueue = new Queue(SCENARIO_JOB_NAME, { connection: getRedis() });
  }
  return scenarioQueue;
}

let apiTestQueue: Queue | null = null;
export function getApiTestQueue(): Queue {
  if (!apiTestQueue) {
    apiTestQueue = new Queue(API_TEST_JOB_NAME, { connection: getRedis() });
  }
  return apiTestQueue;
}

export interface CrawlJobData {
  runId: string;
  baseUrl: string;
  configSnapshot: Config;
}

export interface ScenarioJobData {
  scenarioRunId: string;
  scenarioId: string;
  configSnapshot: Config;
}

export interface ApiTestJobData {
  apiTestRunId: string;
  endpoints: ApiEndpoint[];
}

export async function enqueueCrawl(runId: string, baseUrl: string, configSnapshot: Config) {
  const job = await getCrawlQueue().add(CRAWL_JOB_NAME, {
    runId,
    baseUrl,
    configSnapshot,
  } as CrawlJobData);
  return job.id;
}

export async function enqueueScenario(scenarioRunId: string, scenarioId: string, configSnapshot: Config) {
  const job = await getScenarioQueue().add(SCENARIO_JOB_NAME, {
    scenarioRunId,
    scenarioId,
    configSnapshot,
  } as ScenarioJobData);
  return job.id;
}

export async function enqueueApiTest(apiTestRunId: string, endpoints: ApiEndpoint[]) {
  const job = await getApiTestQueue().add(API_TEST_JOB_NAME, {
    apiTestRunId,
    endpoints,
  } as ApiTestJobData);
  return job.id;
}
