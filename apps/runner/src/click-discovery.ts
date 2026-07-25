import type { Page as PlaywrightPage } from 'playwright';
import type { CrawlConfig } from 'pre-release-checker-shared';
import { isDangerousElementText, isExcluded, isSameOrigin } from './guards.js';

const CANDIDATE_SELECTOR = `button, a:not([href]), [role="link"], [role="button"], [onclick]`;
const MAX_CANDIDATES = 10;
const CLICK_WAIT_MS = 1500;

interface CandidateInfo {
  index: number;
  text: string;
}

export async function discoverUrlsByClick(
  page: PlaywrightPage,
  baseUrl: string,
  config: CrawlConfig,
  visited: Set<string>
): Promise<string[]> {
  const startUrl = page.url();
  const candidates = await page.evaluate(
    ({ selector, maxCandidates }: { selector: string; maxCandidates: number }) => {
      const elements = Array.from(document.querySelectorAll(selector));
      const results: CandidateInfo[] = [];
      for (let i = 0; i < elements.length && results.length < maxCandidates; i++) {
        const el = elements[i] as HTMLElement;
        if (el.closest('form')) continue;
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' && el.getAttribute('type') === 'submit') continue;
        if (tag === 'input' && (el as HTMLInputElement).type === 'submit') continue;
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (!text || text.length > 80) continue;
        results.push({ index: i, text });
      }
      return results;
    },
    { selector: CANDIDATE_SELECTOR, maxCandidates: MAX_CANDIDATES }
  );

  const safeCandidates = candidates.filter((c) => !isDangerousElementText(c.text));
  const discovered: string[] = [];

  for (const candidate of safeCandidates) {
    if (discovered.length >= MAX_CANDIDATES) break;

    const beforeUrl = page.url();
    let afterUrl = beforeUrl;

    try {
      afterUrl = await page.evaluate(
        ({ selector, index, waitMs }: { selector: string; index: number; waitMs: number }) => {
          const el = document.querySelectorAll(selector)[index] as HTMLElement | null;
          if (!el) return location.href;
          el.click();
          return new Promise<string>((resolve) => setTimeout(() => resolve(location.href), waitMs));
        },
        { selector: CANDIDATE_SELECTOR, index: candidate.index, waitMs: CLICK_WAIT_MS }
      );
    } catch {
      // ページ遷移で execution context が破棄された場合など
      afterUrl = page.url();
    }

    if (
      afterUrl !== beforeUrl &&
      isSameOrigin(baseUrl, afterUrl) &&
      !isExcluded(afterUrl, config) &&
      !visited.has(afterUrl)
    ) {
      discovered.push(afterUrl);
    }

    if (page.url() !== startUrl) {
      await page.goto(startUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    }
  }

  return [...new Set(discovered)];
}
