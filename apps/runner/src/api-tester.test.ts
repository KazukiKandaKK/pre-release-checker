import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiEndpoint } from 'pre-release-checker-shared';
import { runApiTest } from './api-tester.js';

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
  return {
    id: 'ep1',
    name: 'testEndpoint',
    method: 'GET',
    url: 'http://example.com/api/thing',
    headers: undefined,
    body: undefined,
    expectedStatus: undefined,
    expectedContentType: undefined,
    timeoutMs: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ApiEndpoint;
}

function mockFetchResponse(status: number, contentType: string | null) {
  return vi.fn().mockResolvedValue({
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
  } as unknown as Response);
}

describe('runApiTest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not flag a 200 when expectedStatus is null (as persisted by Prisma)', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, 'text/html'));
    // Simulates a WebSocket-style endpoint imported without a status expectation.
    const ep = makeEndpoint({ expectedStatus: null as unknown as undefined, expectedContentType: null as unknown as undefined });

    const { findings, results } = await runApiTest([ep]);

    expect(findings).toHaveLength(0);
    expect(results[0].status).toBe('ok');
  });

  it('still flags a real status mismatch', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(404, 'application/json'));
    const ep = makeEndpoint({ expectedStatus: 200 });

    const { findings } = await runApiTest([ep]);

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe('API unexpected status: testEndpoint');
  });

  it('sends an Accept header derived from expectedContentType when none is set', async () => {
    const fetchMock = mockFetchResponse(200, 'application/json');
    vi.stubGlobal('fetch', fetchMock);
    const ep = makeEndpoint({ expectedContentType: 'application/json' });

    await runApiTest([ep]);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it('does not flag a matched non-2xx expectedStatus as an HTTP error', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(400, 'text/plain'));
    // e.g. a WebSocket endpoint that correctly rejects a plain GET with 400.
    const ep = makeEndpoint({ expectedStatus: 400, expectedContentType: 'text/plain' });

    const { findings, results } = await runApiTest([ep]);

    expect(findings).toHaveLength(0);
    expect(results[0].status).toBe('ok');
  });

  it('still flags an unexpected 4xx when no expectedStatus is set', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(500, 'application/json'));
    const ep = makeEndpoint();

    const { findings } = await runApiTest([ep]);

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe('API HTTP error: testEndpoint');
  });

  it('does not override a user-supplied Accept header', async () => {
    const fetchMock = mockFetchResponse(200, 'application/json');
    vi.stubGlobal('fetch', fetchMock);
    const ep = makeEndpoint({
      expectedContentType: 'application/json',
      headers: JSON.stringify({ Accept: 'text/plain' }),
    });

    await runApiTest([ep]);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe('text/plain');
  });
});
