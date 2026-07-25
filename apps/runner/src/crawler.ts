import { chromium } from 'playwright';
import { prisma } from 'pre-release-checker-database';
import { LocalStorage } from 'pre-release-checker-storage';
import type { CrawlConfig, PageSnapshot } from 'pre-release-checker-shared';
import { isAllowedStagingUrl, isExcluded, isSameOrigin } from './guards.js';
import { discoverUrlsByClick } from './click-discovery.js';
import { generateScenariosFromPage } from './scenario-generator.js';
import { authenticateContext, performFormLogin } from './auth.js';
import { buildPageFindings, computePageDiffs, markNewFindings } from './findings.js';

export interface CrawlResult {
  runId: string;
  baseUrl: string;
  pages: PageSnapshot[];
  findings?: import('pre-release-checker-shared').Finding[];
  error?: string;
}

interface QueueItem {
  url: string;
  depth: number;
}

interface ConsoleLog {
  level: string;
  message: string;
  location?: string;
}

export async function runCrawl(
  runId: string,
  baseUrl: string,
  config: CrawlConfig
): Promise<CrawlResult> {
  const envOrigins = process.env.ALLOWED_STAGING_ORIGINS?.split(',');
  if (!isAllowedStagingUrl(baseUrl, config, envOrigins)) {
    return { runId, baseUrl, pages: [], error: '許可されていないオリジンです' };
  }

  const storage = new LocalStorage(process.env.STORAGE_LOCAL_PATH || '../../data/storage');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  await authenticateContext(context, config);

  if (config.authType === 'password' && config.authLoginUrl) {
    const loginPage = await context.newPage();
    await performFormLogin(loginPage, config);
    await loginPage.close();
  }

  const pages: PageSnapshot[] = [];
  const visited = new Set<string>();
  const queue: QueueItem[] = [{ url: baseUrl, depth: 0 }];
  const maxDepth = config.maxDepth ?? 2;
  const maxPages = config.maxPages ?? 50;

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url) || isExcluded(url, config)) continue;
      visited.add(url);

      const page = await context.newPage();
      const consoleLogs: ConsoleLog[] = [];
      let hasJsError = false;
      let httpStatus: number | null = null;
      let hasHttpError = false;

      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          if (msg.type() === 'error') hasJsError = true;
          consoleLogs.push({
            level: msg.type(),
            message: msg.text(),
            location: msg.location().url,
          });
        }
      });

      page.on('pageerror', (err) => {
        hasJsError = true;
        consoleLogs.push({
          level: 'pageerror',
          message: err.message,
          location: err.stack,
        });
      });

      page.on('response', (response) => {
        const status = response.status();
        if (response.request().url() === url && response.request().resourceType() === 'document') {
          httpStatus = status;
        }
        if (status >= 400) {
          hasHttpError = true;
          consoleLogs.push({
            level: 'http-error',
            message: `${response.request().method()} ${response.url()} -> ${status}`,
          });
        }
      });

      let mainResponse: import('playwright').Response | null = null;
      try {
        mainResponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        if (mainResponse) {
          httpStatus = mainResponse.status();
          if (mainResponse.status() >= 400) {
            hasHttpError = true;
            consoleLogs.push({
              level: 'http-error',
              message: `document ${url} -> ${mainResponse.status()}`,
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        consoleLogs.push({ level: 'navigation-error', message });
      }

      const title = await page.title().catch(() => null);

      let screenshotPath: string | null = null;
      try {
        const buffer = await page.screenshot({ type: 'png' });
        screenshotPath = await storage.saveScreenshot(runId, String(pages.length + 1), buffer);
      } catch (err) {
        console.error('screenshot failed', err);
      }

      const pageSnapshot: PageSnapshot = {
        url,
        depth,
        title,
        statusCode: httpStatus,
        hasJsError,
        hasHttpError,
        consoleLogs,
        screenshotPath,
        hasVisualDiff: false,
      };

      await prisma.page.create({
        data: {
          runId,
          url: pageSnapshot.url,
          title: pageSnapshot.title,
          depth: pageSnapshot.depth,
          statusCode: pageSnapshot.statusCode,
          hasJsError: pageSnapshot.hasJsError,
          hasHttpError: pageSnapshot.hasHttpError,
          consoleLogs: JSON.stringify(pageSnapshot.consoleLogs),
          screenshotPath: pageSnapshot.screenshotPath,
        },
      });
      pages.push(pageSnapshot);

      try {
        await generateScenariosFromPage(page, url, baseUrl, config, runId);
      } catch (err) {
        console.error('scenario generation failed for', url, err);
      }

      if (depth < maxDepth) {
        const links = await page
          .$$eval('a[href]', (anchors) =>
            anchors
              .map((a) => (a as HTMLAnchorElement).href)
              .filter((href) => href.startsWith('http'))
          )
          .catch(() => [] as string[]);

        for (const link of new Set(links)) {
          if (
            !visited.has(link) &&
            isSameOrigin(baseUrl, link) &&
            !isExcluded(link, config) &&
            depth + 1 <= maxDepth
          ) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }

        if (config.spaClickDiscovery) {
          try {
            const discovered = await discoverUrlsByClick(page, baseUrl, config, visited);
            for (const url of discovered) {
              if (!visited.has(url) && depth + 1 <= maxDepth) {
                queue.push({ url, depth: depth + 1 });
              }
            }
          } catch (err) {
            console.error('click discovery failed for', url, err);
          }
        }
      }

      await page.close();

      if (config.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.delayMs));
      }
    }
  } finally {
    await browser.close();
  }

  const pagesWithDiff = await computePageDiffs(runId, pages, baseUrl, config.visualDiffThreshold ?? 0.05);
  for (const page of pagesWithDiff) {
    await prisma.page.updateMany({
      where: { runId, url: page.url },
      data: {
        diffPath: page.diffPath ?? null,
        diffRatio: page.diffRatio ?? null,
        hasVisualDiff: page.hasVisualDiff ?? false,
      },
    });
  }

  const findings = await markNewFindings(buildPageFindings(pagesWithDiff), baseUrl, runId);

  return { runId, baseUrl, pages: pagesWithDiff, findings };
}
