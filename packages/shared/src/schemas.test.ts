import { describe, it, expect } from 'vitest';
import { configInputSchema, parseOrigins, parseExcludePatterns } from './schemas.js';

describe('configInputSchema', () => {
  it('accepts a valid staging config', () => {
    const result = configInputSchema.safeParse({
      baseUrl: 'https://staging.example.com',
      allowedOrigins: 'https://staging.example.com, https://staging2.example.com',
      maxDepth: 2,
      concurrency: 2,
      delayMs: 500,
      maxPages: 50,
      excludePatterns: '/logout\n/delete',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.baseUrl).toBe('https://staging.example.com');
      expect(result.data.maxDepth).toBe(2);
    }
  });

  it('rejects an invalid origin', () => {
    const result = configInputSchema.safeParse({
      baseUrl: 'https://staging.example.com',
      allowedOrigins: 'not-a-valid-origin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL baseUrl', () => {
    const result = configInputSchema.safeParse({
      baseUrl: 'not-a-url',
      allowedOrigins: 'https://staging.example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('parseOrigins', () => {
  it('splits and trims comma-separated origins', () => {
    expect(parseOrigins('https://a.com, https://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('parseExcludePatterns', () => {
  it('splits and trims newline-separated patterns', () => {
    expect(parseExcludePatterns('/logout\n/delete')).toEqual(['/logout', '/delete']);
  });
});
