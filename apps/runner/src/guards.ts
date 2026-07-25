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

function matchPattern(url: string, pattern: string): boolean {
  if (!pattern) return false;
  const lowerUrl = url.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  if (!lowerPattern.includes('*') && !lowerPattern.includes('?')) {
    return lowerUrl.includes(lowerPattern);
  }
  const regex = new RegExp(
    '^' + lowerPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return regex.test(lowerUrl);
}

export function isExcluded(url: string, config: CrawlConfig): boolean {
  const userPatterns = parseExcludePatterns(config.excludePatterns);
  const patterns = [...DESTRUCTIVE_SUBSTRINGS, ...userPatterns];
  for (const pattern of patterns) {
    if (matchPattern(url, pattern)) return true;
  }
  return false;
}

export function isSameOrigin(base: string, target: string): boolean {
  const baseOrigin = getOrigin(base);
  const targetOrigin = getOrigin(target);
  return baseOrigin !== null && baseOrigin === targetOrigin;
}

const DANGEROUS_TEXT_PATTERNS = [
  'delete',
  'remove',
  'logout',
  'signout',
  'unsubscribe',
  '購入',
  '決済',
  '支払',
  '削除',
  'ログアウト',
  '退会',
  '解約',
  'アカウント削除',
];

export function isDangerousElementText(text: string): boolean {
  const lower = text.toLowerCase();
  return DANGEROUS_TEXT_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}
