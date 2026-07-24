import { prisma } from 'pre-release-checker-database';
import type { Config, ConfigInput } from 'pre-release-checker-shared';

const DEFAULT_ID = 'default';

function toConfig(row: {
  id: string;
  baseUrl: string;
  allowedOrigins: string;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  excludePatterns: string;
  createdAt: Date;
  updatedAt: Date;
}): Config {
  return {
    id: row.id,
    baseUrl: row.baseUrl,
    allowedOrigins: row.allowedOrigins,
    maxDepth: row.maxDepth,
    concurrency: row.concurrency,
    delayMs: row.delayMs,
    maxPages: row.maxPages,
    excludePatterns: row.excludePatterns,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getConfig(): Promise<Config | null> {
  const row = await prisma.config.findUnique({ where: { id: DEFAULT_ID } });
  return row ? toConfig(row) : null;
}

export async function upsertConfig(input: ConfigInput): Promise<Config> {
  const row = await prisma.config.upsert({
    where: { id: DEFAULT_ID },
    update: {
      baseUrl: input.baseUrl,
      allowedOrigins: input.allowedOrigins,
      maxDepth: input.maxDepth,
      concurrency: input.concurrency,
      delayMs: input.delayMs,
      maxPages: input.maxPages,
      excludePatterns: input.excludePatterns,
    },
    create: {
      id: DEFAULT_ID,
      baseUrl: input.baseUrl,
      allowedOrigins: input.allowedOrigins,
      maxDepth: input.maxDepth,
      concurrency: input.concurrency,
      delayMs: input.delayMs,
      maxPages: input.maxPages,
      excludePatterns: input.excludePatterns,
    },
  });
  return toConfig(row);
}
