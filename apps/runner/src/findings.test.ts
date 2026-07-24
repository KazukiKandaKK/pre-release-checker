import { describe, expect, it } from 'vitest';
import type { PageSnapshot, ScenarioRunResult } from 'pre-release-checker-shared';
import { buildPageFindings, buildScenarioFindings } from './findings.js';

describe('buildPageFindings', () => {
  it('classifies HTTP 500 as Critical and HTTP 404 as High', () => {
    const pages: PageSnapshot[] = [
      { url: 'http://localhost:8080', depth: 0, statusCode: 500, hasJsError: false, hasHttpError: true, consoleLogs: [], hasVisualDiff: false },
      { url: 'http://localhost:8080/missing', depth: 1, statusCode: 404, hasJsError: false, hasHttpError: true, consoleLogs: [], hasVisualDiff: false },
    ];
    const findings = buildPageFindings(pages);
    expect(findings).toHaveLength(2);
    expect(findings[0].severity).toBe('Critical');
    expect(findings[1].severity).toBe('High');
  });

  it('classifies visual diff as Medium', () => {
    const pages: PageSnapshot[] = [
      { url: 'http://localhost:8080', depth: 0, statusCode: 200, hasJsError: false, hasHttpError: false, consoleLogs: [], screenshotPath: 'a.png', diffPath: 'a_diff.png', diffRatio: 0.1, hasVisualDiff: true },
    ];
    const findings = buildPageFindings(pages);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('visual');
    expect(findings[0].severity).toBe('Medium');
  });
});

describe('buildScenarioFindings', () => {
  it('classifies JS and step errors', () => {
    const result: ScenarioRunResult = {
      scenarioId: 's1',
      stepResults: [{ stepIndex: 0, status: 'ok', logs: [], durationMs: 100 }, { stepIndex: 1, status: 'failed', logs: [], error: 'timeout' }],
      consoleLogs: [{ level: 'error', message: 'x' }],
      hasJsError: true,
      hasHttpError: false,
    };
    const findings = buildScenarioFindings('s1', 'Test', 'http://localhost:8080', result);
    expect(findings.some((f) => f.title === 'Scenario JS error')).toBe(true);
    expect(findings.some((f) => f.title === 'Step 2 failed')).toBe(true);
  });
});
