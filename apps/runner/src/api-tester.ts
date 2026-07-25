import type { Finding, ApiEndpoint, ApiTestResult } from 'pre-release-checker-shared';

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export interface ApiTestRunResult {
  results: ApiTestResult[];
  findings: Finding[];
  error?: string;
}

export async function runApiTest(endpoints: ApiEndpoint[]): Promise<ApiTestRunResult> {
  const results: ApiTestResult[] = [];
  const findings: Finding[] = [];
  let error: string | undefined;

  for (const ep of endpoints) {
    const start = Date.now();
    let statusCode: number | null = null;
    let contentType: string | null = null;
    let fetchError: string | undefined;
    let status: ApiTestResult['status'] = 'ok';

    const userHeaders: Record<string, string> = ep.headers ? (JSON.parse(ep.headers) as Record<string, string>) : {};
    const hasAcceptHeader = Object.keys(userHeaders).some((key) => key.toLowerCase() === 'accept');
    const init: RequestInit = {
      method: ep.method,
      headers: hasAcceptHeader || !ep.expectedContentType
        ? userHeaders
        : { Accept: ep.expectedContentType, ...userHeaders },
      body: ep.body || undefined,
    };

    try {
      const res = await fetchWithTimeout(ep.url, init, ep.timeoutMs);
      statusCode = res.status;
      contentType = res.headers.get('content-type');
      const duration = Date.now() - start;

      // expectedStatus comes back as `null` (not `undefined`) once persisted through Prisma,
      // so a truthy check (min status is 100, so 0/falsy never a real expectation) is used here.
      if (ep.expectedStatus && statusCode !== ep.expectedStatus) {
        status = 'failed';
        findings.push({
          category: 'api',
          severity: statusCode >= 500 ? 'Critical' : statusCode >= 400 ? 'High' : 'Medium',
          title: `API unexpected status: ${ep.name}`,
          url: ep.url,
          description: `Expected ${ep.expectedStatus}, got ${statusCode} (${ep.method} ${ep.url})`,
          isNew: true,
        });
      } else if (ep.expectedContentType && contentType && !contentType.includes(ep.expectedContentType)) {
        status = 'failed';
        findings.push({
          category: 'api',
          severity: 'Medium',
          title: `API unexpected content-type: ${ep.name}`,
          url: ep.url,
          description: `Expected ${ep.expectedContentType}, got ${contentType ?? 'none'}`,
          isNew: true,
        });
      } else if (!ep.expectedStatus && statusCode >= 400) {
        status = 'failed';
        findings.push({
          category: 'api',
          severity: statusCode >= 500 ? 'Critical' : 'High',
          title: `API HTTP error: ${ep.name}`,
          url: ep.url,
          description: `${ep.method} ${ep.url} returned ${statusCode}`,
          isNew: true,
        });
      }

      results.push({
        endpointId: ep.id,
        name: ep.name,
        url: ep.url,
        method: ep.method,
        status,
        statusCode,
        responseTimeMs: duration,
        contentType,
      });
    } catch (err) {
      status = 'error';
      fetchError = err instanceof Error ? err.message : String(err);
      findings.push({
        category: 'api',
        severity: 'Critical',
        title: `API request failed: ${ep.name}`,
        url: ep.url,
        description: `${ep.method} ${ep.url} failed: ${fetchError}`,
        isNew: true,
      });
      results.push({
        endpointId: ep.id,
        name: ep.name,
        url: ep.url,
        method: ep.method,
        status,
        statusCode: null,
        responseTimeMs: Date.now() - start,
        contentType: null,
        error: fetchError,
      });
    }
  }

  return { results, findings, error };
}
