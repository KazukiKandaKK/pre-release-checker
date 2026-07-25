import { describe, it, expect } from 'vitest';
import { isAllowedStagingUrl, isExcluded, isSameOrigin, isDangerousElementText } from './guards.js';
import type { CrawlConfig } from 'pre-release-checker-shared';

function makeConfig(overrides: Partial<CrawlConfig> = {}): CrawlConfig {
  return {
    baseUrl: 'https://staging.example.com',
    allowedOrigins: 'https://staging.example.com',
    maxDepth: 2,
    concurrency: 2,
    delayMs: 0,
    maxPages: 50,
    excludePatterns: '',
    authType: 'none',
    scheduleEnabled: false,
    scheduleCron: '0 9 * * *',
    scheduleJobType: 'crawl',
    mailEnabled: false,
    mailPort: 587,
    mailSecure: false,
    visualDiffThreshold: 0.05,
    spaClickDiscovery: false,
    ...overrides,
  };
}

describe('isAllowedStagingUrl', () => {
  it('allows a configured staging origin', () => {
    expect(isAllowedStagingUrl('https://staging.example.com/path', makeConfig())).toBe(true);
  });

  it('rejects an origin not in the allowlist', () => {
    expect(isAllowedStagingUrl('https://production.example.com', makeConfig())).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isAllowedStagingUrl('not-a-url', makeConfig())).toBe(false);
  });

  it('respects env origins', () => {
    const envOrigins = ['https://env.example.com'];
    expect(isAllowedStagingUrl('https://env.example.com/', makeConfig(), envOrigins)).toBe(true);
  });
});

describe('isExcluded', () => {
  it('excludes destructive substrings by default', () => {
    expect(isExcluded('https://staging.example.com/logout', makeConfig())).toBe(true);
    expect(isExcluded('https://staging.example.com/delete-account', makeConfig())).toBe(true);
  });

  it('excludes user patterns', () => {
    const cfg = makeConfig({ excludePatterns: '/admin\n/private' });
    expect(isExcluded('https://staging.example.com/admin/users', cfg)).toBe(true);
    expect(isExcluded('https://staging.example.com/public', cfg)).toBe(false);
  });
});

describe('isSameOrigin', () => {
  it('returns true for same origin', () => {
    expect(isSameOrigin('https://a.com/x', 'https://a.com/y')).toBe(true);
  });

  it('returns false for different origin', () => {
    expect(isSameOrigin('https://a.com', 'https://b.com')).toBe(false);
  });
});

describe('isDangerousElementText', () => {
  it('flags destructive keywords', () => {
    expect(isDangerousElementText('Delete account')).toBe(true);
    expect(isDangerousElementText('アカウント削除')).toBe(true);
    expect(isDangerousElementText('ログアウト')).toBe(true);
  });

  it('allows safe labels', () => {
    expect(isDangerousElementText('Dashboard')).toBe(false);
    expect(isDangerousElementText('設定')).toBe(false);
  });
});
