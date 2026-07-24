const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
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

  getScenarios: () => request<Scenario[]>('/api/scenarios'),
  getScenario: (id: string) => request<Scenario>(`/api/scenarios/${id}`),
  createScenario: (body: ScenarioForm) => request<Scenario>('/api/scenarios', { method: 'POST', body: JSON.stringify(body) }),
  runScenario: (id: string) => request<{ scenarioRunId: string; jobId: string }>(`/api/scenarios/${id}/run`, { method: 'POST' }),
  getScenarioRun: (id: string) => request<ScenarioRun & { scenario: Scenario }>(`/api/scenario-runs/${id}`),
  getScenarioStepScreenshotUrl: (runId: string, stepIndex: number) => `${API_BASE}/api/scenario-runs/${runId}/screenshots/${stepIndex}`,
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
}

export interface ConfigForm {
  baseUrl: string;
  allowedOrigins: string;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  excludePatterns: string;
}

export interface Run {
  id: string;
  status: string;
  baseUrl: string;
  startedAt: string;
  finishedAt?: string;
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
  consoleLogs: unknown[] | null;
  screenshotPath: string | null;
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
  type: 'navigate' | 'fill' | 'select' | 'click' | 'submit' | 'assertText';
  url?: string;
  selector?: string;
  value?: string;
  text?: string;
  operator?: 'contains' | 'exists';
  label?: string;
}

export interface ScenarioRun {
  id: string;
  scenarioId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  result?: ScenarioRunResult;
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
