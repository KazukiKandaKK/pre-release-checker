import { config } from 'dotenv';
config({ path: '../../.env' });

import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from 'pre-release-checker-database';
import {
  API_TEST_JOB_NAME,
  configSchema,
  CRAWL_JOB_NAME,
  runStatusSchema,
  SCENARIO_JOB_NAME,
  scenarioRunStatusSchema,
  apiTestRunStatusSchema,
} from 'pre-release-checker-shared';
import type { ApiEndpoint, Config, Scenario } from 'pre-release-checker-shared';
import { runCrawl } from './crawler.js';
import { runScenario } from './scenario-runner.js';
import { runApiTest } from './api-tester.js';
import { sendMailReport } from './mailer.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface CrawlJobData {
  runId: string;
  baseUrl: string;
  configSnapshot: Config;
}

interface ScenarioJobData {
  scenarioRunId: string;
  scenarioId: string;
  configSnapshot: Config;
}

interface ApiTestJobData {
  apiTestRunId: string;
  endpoints: ApiEndpoint[];
}

const parsedConfig = (snapshot: unknown) =>
  configSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(snapshot);

async function main() {
  const crawlWorker = new Worker(
    CRAWL_JOB_NAME,
    async (job) => {
      const { runId, baseUrl, configSnapshot } = job.data as CrawlJobData;
      const config = parsedConfig(configSnapshot);

      await prisma.run.update({
        where: { id: runId },
        data: { status: runStatusSchema.Enum.running },
      });

      const result = await runCrawl(runId, baseUrl, config);

      await prisma.run.update({
        where: { id: runId },
        data: {
          status: result.error ? runStatusSchema.Enum.failed : runStatusSchema.Enum.completed,
          finishedAt: new Date(),
          findings: result.findings ? JSON.stringify(result.findings) : null,
        },
      });

      await sendMailReport(config, `クロール ${baseUrl}`, result.findings ?? []);

      if (result.error) {
        throw new Error(result.error);
      }
    },
    { connection, concurrency: Number(process.env.RUNNER_CONCURRENCY) || 2 }
  );

  const scenarioWorker = new Worker(
    SCENARIO_JOB_NAME,
    async (job) => {
      const { scenarioRunId, scenarioId, configSnapshot } = job.data as ScenarioJobData;
      const config = parsedConfig(configSnapshot);

      const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
      if (!scenario) throw new Error('Scenario not found');

      await prisma.scenarioRun.update({
        where: { id: scenarioRunId },
        data: { status: scenarioRunStatusSchema.Enum.running },
      });

      const { result, findings, error } = await runScenario(
        { ...scenario, steps: JSON.parse(scenario.steps) } as unknown as Scenario,
        scenarioRunId,
        config
      );

      await prisma.scenarioRun.update({
        where: { id: scenarioRunId },
        data: {
          status: error ? scenarioRunStatusSchema.Enum.failed : scenarioRunStatusSchema.Enum.completed,
          finishedAt: new Date(),
          result: JSON.stringify(result),
          findings: findings ? JSON.stringify(findings) : null,
          error: error ?? null,
        },
      });

      await sendMailReport(config, `シナリオ ${scenario.name}`, findings ?? []);

      if (error) throw new Error(error);
    },
    { connection, concurrency: Number(process.env.RUNNER_CONCURRENCY) || 2 }
  );

  const apiTestWorker = new Worker(
    API_TEST_JOB_NAME,
    async (job) => {
      const { apiTestRunId, endpoints } = job.data as ApiTestJobData;

      await prisma.apiTestRun.update({
        where: { id: apiTestRunId },
        data: { status: apiTestRunStatusSchema.Enum.running },
      });

      const { results, findings, error } = await runApiTest(endpoints);

      await prisma.apiTestRun.update({
        where: { id: apiTestRunId },
        data: {
          status: error ? apiTestRunStatusSchema.Enum.failed : apiTestRunStatusSchema.Enum.completed,
          finishedAt: new Date(),
          results: JSON.stringify(results),
          findings: findings.length ? JSON.stringify(findings) : null,
          error: error ?? null,
        },
      });

      if (error) throw new Error(error);
    },
    { connection, concurrency: Number(process.env.RUNNER_CONCURRENCY) || 2 }
  );

  crawlWorker.on('failed', (job, err) => {
    console.error(`Crawl job ${job?.id} failed:`, err);
  });
  scenarioWorker.on('failed', (job, err) => {
    console.error(`Scenario job ${job?.id} failed:`, err);
  });
  apiTestWorker.on('failed', (job, err) => {
    console.error(`API test job ${job?.id} failed:`, err);
  });

  console.log(`Runner started for queues "${CRAWL_JOB_NAME}", "${SCENARIO_JOB_NAME}" and "${API_TEST_JOB_NAME}"`);
}

main().catch((err) => {
  console.error('Failed to start runner', err);
  process.exit(1);
});
