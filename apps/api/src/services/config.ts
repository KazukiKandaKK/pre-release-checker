import { prisma } from 'pre-release-checker-database';
import type { Config, ConfigInput } from 'pre-release-checker-shared';
import { decrypt, encrypt } from './crypto.js';

const DEFAULT_ID = 'default';
const SENSITIVE_FIELDS = ['authPassword', 'authCookie', 'authToken', 'mailPassword'] as const;

type DbConfig = Awaited<ReturnType<typeof prisma.config.findUnique>>;

export function toConfig(row: NonNullable<DbConfig>): Config {
  const base = {
    id: row.id,
    baseUrl: row.baseUrl,
    allowedOrigins: row.allowedOrigins,
    maxDepth: row.maxDepth,
    concurrency: row.concurrency,
    delayMs: row.delayMs,
    maxPages: row.maxPages,
    excludePatterns: row.excludePatterns,
    authType: row.authType as Config['authType'],
    authLoginUrl: row.authLoginUrl || undefined,
    authUsername: row.authUsername || undefined,
    authPassword: row.authPassword ? decrypt(row.authPassword) : undefined,
    authCookie: row.authCookie ? decrypt(row.authCookie) : undefined,
    authToken: row.authToken ? decrypt(row.authToken) : undefined,
    scheduleEnabled: row.scheduleEnabled,
    scheduleCron: row.scheduleCron,
    scheduleJobType: row.scheduleJobType as Config['scheduleJobType'],
    mailEnabled: row.mailEnabled,
    mailHost: row.mailHost || undefined,
    mailPort: row.mailPort,
    mailSecure: row.mailSecure,
    mailUser: row.mailUser || undefined,
    mailFrom: row.mailFrom || undefined,
    mailTo: row.mailTo || undefined,
    mailPassword: row.mailPassword ? decrypt(row.mailPassword) : undefined,
    visualDiffThreshold: row.visualDiffThreshold,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  return base as Config;
}

export async function getConfig(): Promise<Config | null> {
  const row = await prisma.config.findUnique({ where: { id: DEFAULT_ID } });
  return row ? toConfig(row) : null;
}

export async function upsertConfig(input: ConfigInput): Promise<Config> {
  const allowedOrigins =
    input.allowedOrigins?.trim() || new URL(input.baseUrl).origin;
  const data = {
    baseUrl: input.baseUrl,
    allowedOrigins,
    maxDepth: input.maxDepth,
    concurrency: input.concurrency,
    delayMs: input.delayMs,
    maxPages: input.maxPages,
    excludePatterns: input.excludePatterns,
    authType: input.authType,
    authLoginUrl: input.authLoginUrl || null,
    authUsername: input.authUsername || null,
    authPassword: input.authPassword ? encrypt(input.authPassword) : null,
    authCookie: input.authCookie ? encrypt(input.authCookie) : null,
    authToken: input.authToken ? encrypt(input.authToken) : null,
    scheduleEnabled: input.scheduleEnabled,
    scheduleCron: input.scheduleCron,
    scheduleJobType: input.scheduleJobType,
    mailEnabled: input.mailEnabled,
    mailHost: input.mailHost || null,
    mailPort: input.mailPort,
    mailSecure: input.mailSecure,
    mailUser: input.mailUser || null,
    mailFrom: input.mailFrom || null,
    mailTo: input.mailTo || null,
    mailPassword: input.mailPassword ? encrypt(input.mailPassword) : null,
    visualDiffThreshold: input.visualDiffThreshold,
  };

  const row = await prisma.config.upsert({
    where: { id: DEFAULT_ID },
    update: data,
    create: { id: DEFAULT_ID, ...data },
  });
  return toConfig(row);
}

export function redactConfig(config: Config): Config {
  const redacted = { ...config } as Record<string, unknown>;
  for (const field of SENSITIVE_FIELDS) {
    if (redacted[field]) redacted[field] = '***';
  }
  return redacted as Config;
}
