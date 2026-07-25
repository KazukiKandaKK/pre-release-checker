const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatValidationErrors(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const fieldErrors = (details as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors;
  if (!fieldErrors) return undefined;
  const lines = Object.entries(fieldErrors)
    .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
    .filter(Boolean);
  return lines.length ? lines.join('; ') : undefined;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.message || formatValidationErrors(body.details) || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  getConfig: () => request<ConfigView>('/api/config'),
  saveConfig: (body: ConfigForm) => request<ConfigView>('/api/config', { method: 'POST', body: JSON.stringify(body) }),
  startCrawl: (baseUrl: string) => request<{ runId: string; jobId: string }>('/api/jobs/crawl', { method: 'POST', body: JSON.stringify({ baseUrl }) }),
  getRuns: () => request<Run[]>('/api/runs'),
  getRun: (id: string) => request<Run & { pages: Page[] }>(`/api/runs/${id}`),
  getRunPages: (id: string) => request<Page[]>(`/api/runs/${id}/pages`),
  getScreenshotUrl: (runId: string, pageId: string) => `${API_BASE}/api/runs/${runId}/pages/${pageId}/screenshot`,
  getDiffUrl: (runId: string, pageId: string) => `${API_BASE}/api/runs/${runId}/pages/${pageId}/diff`,

  getScenarios: () => request<Scenario[]>('/api/scenarios'),
  getScenario: (id: string) => request<Scenario>(`/api/scenarios/${id}`),
  createScenario: (body: ScenarioForm) => request<Scenario>('/api/scenarios', { method: 'POST', body: JSON.stringify(body) }),
  runScenario: (id: string) => request<{ scenarioRunId: string; jobId: string }>(`/api/scenarios/${id}/run`, { method: 'POST' }),
  getScenarioRun: (id: string) => request<ScenarioRun & { scenario: Scenario }>(`/api/scenario-runs/${id}`),
  getScenarioStepScreenshotUrl: (runId: string, stepIndex: number) => `${API_BASE}/api/scenario-runs/${runId}/screenshots/${stepIndex}`,

  getApiEndpoints: () => request<ApiEndpoint[]>('/api/api-endpoints'),
  createApiEndpoint: (body: ApiEndpointForm) => request<ApiEndpoint>('/api/api-endpoints', { method: 'POST', body: JSON.stringify(body) }),
  updateApiEndpoint: (id: string, body: ApiEndpointForm) => request<ApiEndpoint>(`/api/api-endpoints/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteApiEndpoint: (id: string) => request<void>(`/api/api-endpoints/${id}`, { method: 'DELETE' }),
  getApiTestRuns: () => request<ApiTestRun[]>('/api/api-test-runs'),
  getApiTestRun: (id: string) => request<ApiTestRun>(`/api/api-test-runs/${id}`),
  startApiTest: () => request<{ apiTestRunId: string; jobId: string }>('/api/api-test-runs', { method: 'POST' }),
  importOpenApi: (body: { spec: string; baseUrl?: string; dryRun?: boolean }) =>
    request<{ count: number; baseUrl: string; endpoints: ApiEndpoint[] }>('/api/api-endpoints/import-openapi', { method: 'POST', body: JSON.stringify(body) }),
};

export interface ConfigView {
  id: string;
  baseUrl: string;
  allowedOrigins: string;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  excludePatterns: string;
  authType: 'none' | 'cookie' | 'basic' | 'oauth' | 'password';
  authLoginUrl?: string;
  authUsername?: string;
  authPassword?: string;
  authCookie?: string;
  authToken?: string;
  scheduleEnabled: boolean;
  scheduleCron: string;
  scheduleJobType: 'crawl' | 'scenarios';
  mailEnabled: boolean;
  mailHost?: string;
  mailPort: number;
  mailSecure: boolean;
  mailUser?: string;
  mailFrom?: string;
  mailTo?: string;
  mailPassword?: string;
  visualDiffThreshold: number;
}

export interface ConfigForm {
  baseUrl: string;
  allowedOrigins: string;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  excludePatterns: string;
  authType: 'none' | 'cookie' | 'basic' | 'oauth' | 'password';
  authLoginUrl?: string;
  authUsername?: string;
  authPassword?: string;
  authCookie?: string;
  authToken?: string;
  scheduleEnabled: boolean;
  scheduleCron: string;
  scheduleJobType: 'crawl' | 'scenarios';
  mailEnabled: boolean;
  mailHost?: string;
  mailPort: number;
  mailSecure: boolean;
  mailUser?: string;
  mailFrom?: string;
  mailTo?: string;
  mailPassword?: string;
  visualDiffThreshold: number;
}

export interface Finding {
  category: 'http' | 'js' | 'visual' | 'scenario' | 'api';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  url?: string;
  description: string;
  screenshotPath?: string | null;
  diffPath?: string | null;
  isNew?: boolean;
}

export interface Run {
  id: string;
  status: string;
  baseUrl: string;
  startedAt: string;
  finishedAt?: string;
  findings?: Finding[] | null;
}

export interface Page {
  id: string;
  runId: string;
  url: string;
  title: string | null;
  depth: number;
  statusCode: number | null;
  hasJsError: boolean;
  hasHttpError: boolean;
  hasVisualDiff: boolean;
  diffRatio: number | null;
  consoleLogs: unknown[] | null;
  screenshotPath: string | null;
  diffPath: string | null;
  visitedAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  source: string;
  risk: 'safe' | 'needs-auth' | 'destructive';
  status: 'active' | 'disabled';
  baseUrl: string;
  pageUrl: string;
  steps: ScenarioStep[];
  runId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioForm {
  name: string;
  description?: string;
  risk: 'safe' | 'needs-auth' | 'destructive';
  status: 'active' | 'disabled';
  baseUrl: string;
  pageUrl: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  type: 'navigate' | 'fill' | 'select' | 'click' | 'submit' | 'assertText' | 'reload' | 'goBack' | 'goForward' | 'rapidClick' | 'clear' | 'wait';
  url?: string;
  selector?: string;
  value?: string;
  text?: string;
  operator?: 'contains' | 'exists';
  times?: number;
  durationMs?: number;
  label?: string;
}

export interface ScenarioRun {
  id: string;
  scenarioId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  result?: ScenarioRunResult;
  findings?: Finding[] | null;
  error?: string;
}

export interface ScenarioRunResult {
  scenarioId: string;
  stepResults: ScenarioRunStepResult[];
  consoleLogs: unknown[];
  hasJsError: boolean;
  hasHttpError: boolean;
}

export interface ScenarioRunStepResult {
  stepIndex: number;
  status: 'ok' | 'failed' | 'skipped';
  logs: unknown[];
  screenshotPath?: string | null;
  error?: string;
  durationMs?: number;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: string;
  body?: string;
  expectedStatus?: number;
  expectedContentType?: string;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEndpointForm {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: string;
  body?: string;
  expectedStatus?: number;
  expectedContentType?: string;
  timeoutMs: number;
}

export interface ApiTestResult {
  endpointId: string;
  name: string;
  url: string;
  method: string;
  status: 'ok' | 'failed' | 'error';
  statusCode: number | null;
  responseTimeMs: number;
  contentType: string | null;
  error?: string;
}

export interface ApiTestRun {
  id: string;
  status: string;
  endpoints: ApiEndpoint[];
  results?: ApiTestResult[] | null;
  findings?: Finding[] | null;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface OpenApiImportResponse {
  count: number;
  baseUrl: string;
  endpoints: ApiEndpoint[];
}
