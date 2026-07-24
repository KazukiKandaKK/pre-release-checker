import { URL } from 'node:url';
import { DESTRUCTIVE_SUBSTRINGS, parseExcludePatterns, parseOrigins } from 'pre-release-checker-shared';
import type { CrawlConfig } from 'pre-release-checker-shared';

export function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isAllowedStagingUrl(url: string, config: CrawlConfig, envOrigins?: string[]): boolean {
  const origin = getOrigin(url);
  if (!origin) return false;

  const allowed = new Set(parseOrigins(config.allowedOrigins));
  if (envOrigins) {
    for (const o of envOrigins) allowed.add(o.trim());
  }
  if (allowed.size === 0) return false;

  return allowed.has(origin);
}

export function isExcluded(url: string, config: CrawlConfig): boolean {
  const lower = url.toLowerCase();
  const userPatterns = parseExcludePatterns(config.excludePatterns);
  const patterns = [...DESTRUCTIVE_SUBSTRINGS, ...userPatterns];
  for (const pattern of patterns) {
    if (!pattern) continue;
    if (lower.includes(pattern.toLowerCase())) return true;
  }
  return false;
}

export function isSameOrigin(base: string, target: string): boolean {
  const baseOrigin = getOrigin(base);
  const targetOrigin = getOrigin(target);
  return baseOrigin !== null && baseOrigin === targetOrigin;
}
