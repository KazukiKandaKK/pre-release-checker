import { z } from 'zod';
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_DELAY_MS,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_PAGES,
} from './constants.js';

export const urlSchema = z.string().url();

const commaSeparatedOriginsSchema = z
  .string()
  .default('')
  .refine(
    (s) => {
      const origins = s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      return origins.length === 0 || origins.every((o) => /^https?:\/\/[^/]+/.test(o));
    },
    'origin 形式で入力してください（カンマ区切り）'
  );

const excludePatternsSchema = z.string().default('');

export const authTypeSchema = z.enum(['none', 'cookie', 'basic', 'oauth', 'password']);

export const configInputSchema = z.object({
  baseUrl: urlSchema,
  allowedOrigins: commaSeparatedOriginsSchema,
  maxDepth: z.coerce.number().int().min(0).max(5).default(DEFAULT_MAX_DEPTH),
  concurrency: z.coerce.number().int().min(1).max(10).default(DEFAULT_CONCURRENCY),
  delayMs: z.coerce.number().int().min(0).max(10000).default(DEFAULT_DELAY_MS),
  maxPages: z.coerce.number().int().min(1).max(200).default(DEFAULT_MAX_PAGES),
  excludePatterns: excludePatternsSchema,
  authType: authTypeSchema.default('none'),
  authLoginUrl: z.string().url().optional().or(z.literal('')),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  authCookie: z.string().optional(),
  authToken: z.string().optional(),
  scheduleEnabled: z.coerce.boolean().default(false),
  scheduleCron: z.string().default('0 9 * * *'),
  scheduleJobType: z.enum(['crawl', 'scenarios']).default('crawl'),
  mailEnabled: z.coerce.boolean().default(false),
  mailHost: z.string().optional().or(z.literal('')),
  mailPort: z.coerce.number().int().min(1).max(65535).default(587),
  mailSecure: z.coerce.boolean().default(false),
  mailUser: z.string().optional(),
  mailFrom: z.string().optional(),
  mailTo: z.string().optional(),
  mailPassword: z.string().optional(),
  visualDiffThreshold: z.coerce.number().min(0).max(1).default(0.05),
  spaClickDiscovery: z.coerce.boolean().default(false),
});

export const configSchema = configInputSchema.extend({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ParsedOrigins = string[];

export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function parseExcludePatterns(value: string): string[] {
  return value
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

export const pageSnapshotSchema = z.object({
  url: z.string(),
  depth: z.number().int().min(0),
  title: z.string().nullable().optional(),
  statusCode: z.number().int().nullable().optional(),
  hasJsError: z.boolean().default(false),
  hasHttpError: z.boolean().default(false),
  consoleLogs: z
    .array(
      z.object({
        level: z.string(),
        message: z.string(),
        location: z.string().optional(),
      })
    )
    .default([]),
  screenshotPath: z.string().nullable().optional(),
  diffPath: z.string().nullable().optional(),
  diffRatio: z.number().nullable().optional(),
  hasVisualDiff: z.boolean().default(false),
});

export const runStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

export const findingSeveritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);

export const findingCategorySchema = z.enum(['http', 'js', 'visual', 'scenario', 'api']);

export const findingSchema = z.object({
  category: findingCategorySchema,
  severity: findingSeveritySchema,
  title: z.string(),
  url: z.string().optional(),
  description: z.string(),
  screenshotPath: z.string().nullable().optional(),
  diffPath: z.string().nullable().optional(),
  isNew: z.boolean().default(true),
});

export type Finding = z.infer<typeof findingSchema>;

export const runSchema = z.object({
  id: z.string(),
  status: runStatusSchema,
  baseUrl: z.string(),
  configSnapshot: configSchema.omit({ id: true, createdAt: true, updatedAt: true }),
  findings: z.array(findingSchema).nullable().optional(),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable().optional(),
});

export const pageSchema = z.object({
  id: z.string(),
  runId: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  depth: z.number().int(),
  statusCode: z.number().int().nullable(),
  hasJsError: z.boolean(),
  hasHttpError: z.boolean(),
  consoleLogs: z.array(z.record(z.any())).nullable(),
  screenshotPath: z.string().nullable(),
  diffPath: z.string().nullable().optional(),
  diffRatio: z.number().nullable().optional(),
  hasVisualDiff: z.boolean().default(false),
  visitedAt: z.coerce.date(),
});

export const createRunSchema = z.object({
  baseUrl: urlSchema,
});

export const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.record(z.unknown()),
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']),
  progress: z.number().min(0).max(100).optional(),
});

export const scenarioStepSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('navigate'),
    url: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('fill'),
    selector: z.string(),
    value: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('select'),
    selector: z.string(),
    value: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('click'),
    selector: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('submit'),
    selector: z.string().optional(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('assertText'),
    selector: z.string().optional(),
    text: z.string(),
    operator: z.enum(['contains', 'exists']).default('contains'),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('reload'),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('goBack'),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('goForward'),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('rapidClick'),
    selector: z.string(),
    times: z.coerce.number().int().min(1).max(50).default(3),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('clear'),
    selector: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('wait'),
    durationMs: z.coerce.number().int().min(0).max(60000).default(1000),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('clickAt'),
    x: z.coerce.number().int(),
    y: z.coerce.number().int(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('typeText'),
    text: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal('dragAt'),
    fromX: z.coerce.number().int(),
    fromY: z.coerce.number().int(),
    toX: z.coerce.number().int(),
    toY: z.coerce.number().int(),
    label: z.string().optional(),
  }),
]);

export const scenarioInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  risk: z.enum(['safe', 'needs-auth', 'destructive']).default('safe'),
  status: z.enum(['active', 'disabled']).default('active'),
  baseUrl: z.string(),
  pageUrl: z.string(),
  steps: z.array(scenarioStepSchema).min(1),
});

export const scenarioSchema = scenarioInputSchema.extend({
  id: z.string(),
  source: z.string(),
  runId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const scenarioRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

export const scenarioRunStepResultSchema = z.object({
  stepIndex: z.number().int(),
  status: z.enum(['ok', 'failed', 'skipped']),
  logs: z.array(z.record(z.any())).default([]),
  screenshotPath: z.string().nullable().optional(),
  error: z.string().optional(),
  durationMs: z.number().int().optional(),
});

export const scenarioRunResultSchema = z.object({
  scenarioId: z.string(),
  stepResults: z.array(scenarioRunStepResultSchema),
  consoleLogs: z.array(z.record(z.any())).default([]),
  hasJsError: z.boolean().default(false),
  hasHttpError: z.boolean().default(false),
});

export const scenarioRunSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  status: scenarioRunStatusSchema,
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable().optional(),
  result: scenarioRunResultSchema.nullable().optional(),
  findings: z.array(findingSchema).nullable().optional(),
  error: z.string().nullable().optional(),
});

export const createScenarioRunSchema = z.object({
  scenarioId: z.string(),
});

export const apiEndpointInputSchema = z.object({
  name: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  url: z.string().url(),
  headers: z.string().optional(),
  body: z.string().optional(),
  expectedStatus: z.coerce.number().int().min(100).max(599).optional(),
  expectedContentType: z.string().optional(),
  timeoutMs: z.coerce.number().int().min(1).max(60000).default(5000),
});

export const apiEndpointSchema = apiEndpointInputSchema.extend({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const apiTestRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

export const apiTestResultSchema = z.object({
  endpointId: z.string(),
  name: z.string(),
  url: z.string(),
  method: z.string(),
  status: z.enum(['ok', 'failed', 'error']),
  statusCode: z.number().int().nullable(),
  responseTimeMs: z.number().int(),
  contentType: z.string().nullable(),
  error: z.string().optional(),
});

export const apiTestRunSchema = z.object({
  id: z.string(),
  status: apiTestRunStatusSchema,
  endpoints: z.array(apiEndpointSchema),
  results: z.array(apiTestResultSchema).nullable().optional(),
  findings: z.array(findingSchema).nullable().optional(),
  error: z.string().nullable().optional(),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable().optional(),
});

export const openapiImportSchema = z.object({
  spec: z.string().min(1),
  baseUrl: z.string().url().optional(),
  dryRun: z.coerce.boolean().default(false),
});

export const openapiImportResponseSchema = z.object({
  count: z.number().int(),
  baseUrl: z.string(),
  endpoints: z.array(apiEndpointInputSchema),
});
