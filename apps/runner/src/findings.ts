import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { prisma } from 'pre-release-checker-database';
import type { Finding, PageSnapshot, ScenarioRunResult } from 'pre-release-checker-shared';

export async function computePageDiffs(
  runId: string,
  pages: PageSnapshot[],
  baseUrl: string,
  threshold: number
): Promise<PageSnapshot[]> {
  const previousRun = await prisma.run.findFirst({
    where: { baseUrl, status: 'completed', id: { not: runId } },
    orderBy: { startedAt: 'desc' },
    include: { pages: true },
  });

  const previousPageMap = new Map<string, { screenshotPath: string | null; url: string }>();
  if (previousRun) {
    for (const p of previousRun.pages) {
      if (p.screenshotPath) previousPageMap.set(p.url, { screenshotPath: p.screenshotPath, url: p.url });
    }
  }

  const updated: PageSnapshot[] = [];
  for (const page of pages) {
    if (!page.screenshotPath) {
      updated.push(page);
      continue;
    }
    const previous = previousPageMap.get(page.url);
    if (!previous || !previous.screenshotPath) {
      updated.push(page);
      continue;
    }

    try {
      const [img1, img2] = await Promise.all([loadPng(previous.screenshotPath), loadPng(page.screenshotPath)]);
      if (img1.width !== img2.width || img1.height !== img2.height) {
        updated.push({ ...page, hasVisualDiff: true, diffRatio: 1 });
        continue;
      }
      const diff = new PNG({ width: img1.width, height: img1.height });
      const diffPixelCount = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });
      const totalPixels = img1.width * img1.height;
      const diffRatio = totalPixels > 0 ? diffPixelCount / totalPixels : 0;

      const diffPath = page.screenshotPath.replace(/\.png$/, '_diff.png');
      if (diffRatio > threshold) {
        await writePng(diff, diffPath);
        updated.push({ ...page, hasVisualDiff: true, diffRatio, diffPath });
      } else {
        updated.push(page);
      }
    } catch {
      updated.push(page);
    }
  }

  return updated;
}

function loadPng(path: string): Promise<PNG> {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    createReadStream(path)
      .pipe(png)
      .on('parsed', () => resolve(png))
      .on('error', reject);
  });
}

async function writePng(png: PNG, path: string): Promise<void> {
  const pack = png.pack();
  await pipeline(pack, createWriteStream(path));
}

export function buildPageFindings(pages: PageSnapshot[]): Finding[] {
  const findings: Finding[] = [];
  for (const page of pages) {
    if (page.hasHttpError && page.statusCode != null) {
      const severity = page.statusCode >= 500 ? 'Critical' : 'High';
      findings.push({
        category: 'http',
        severity,
        title: `HTTP ${page.statusCode}`,
        url: page.url,
        description: `HTTP status ${page.statusCode} detected`,
        screenshotPath: page.screenshotPath || undefined,
        isNew: true,
      });
    }
    if (page.hasJsError) {
      findings.push({
        category: 'js',
        severity: 'High',
        title: 'JavaScript error',
        url: page.url,
        description: 'Console or page error detected',
        screenshotPath: page.screenshotPath || undefined,
        isNew: true,
      });
    }
    if (page.hasVisualDiff && page.diffRatio != null) {
      findings.push({
        category: 'visual',
        severity: 'Medium',
        title: 'Visual diff',
        url: page.url,
        description: `Visual diff ratio ${(page.diffRatio * 100).toFixed(2)}%`,
        screenshotPath: page.screenshotPath || undefined,
        diffPath: page.diffPath || undefined,
        isNew: true,
      });
    }
  }
  return findings;
}

export function buildScenarioFindings(
  _scenarioId: string,
  scenarioName: string,
  pageUrl: string,
  result: ScenarioRunResult
): Finding[] {
  const findings: Finding[] = [];
  if (result.hasHttpError) {
    findings.push({
      category: 'scenario',
      severity: 'High',
      title: 'Scenario HTTP error',
      url: pageUrl,
      description: `Scenario "${scenarioName}" detected an HTTP error`,
      isNew: true,
    });
  }
  if (result.hasJsError) {
    findings.push({
      category: 'scenario',
      severity: 'High',
      title: 'Scenario JS error',
      url: pageUrl,
      description: `Scenario "${scenarioName}" detected a JavaScript error`,
      isNew: true,
    });
  }
  for (let i = 0; i < result.stepResults.length; i++) {
    const step = result.stepResults[i];
    if (step.status === 'failed') {
      findings.push({
        category: 'scenario',
        severity: 'Medium',
        title: `Step ${i + 1} failed`,
        url: pageUrl,
        description: `Scenario "${scenarioName}" step ${i + 1} failed${step.error ? `: ${step.error}` : ''}`,
        screenshotPath: step.screenshotPath || undefined,
        isNew: true,
      });
    } else if ((step.durationMs ?? 0) > 5000) {
      findings.push({
        category: 'scenario',
        severity: 'Low',
        title: `Step ${i + 1} slow`,
        url: pageUrl,
        description: `Scenario "${scenarioName}" step ${i + 1} took ${step.durationMs}ms`,
        isNew: true,
      });
    }
  }
  return findings;
}

export async function markNewFindings(currentFindings: Finding[], baseUrl: string, currentRunId: string): Promise<Finding[]> {
  const previousRun = await prisma.run.findFirst({
    where: { baseUrl, status: 'completed', id: { not: currentRunId } },
    orderBy: { startedAt: 'desc' },
  });
  const previousKeys = new Set<string>();
  if (previousRun && previousRun.findings) {
    for (const f of JSON.parse(previousRun.findings) as Finding[]) {
      previousKeys.add(findingKey(f));
    }
  }

  return currentFindings.map((f) => ({ ...f, isNew: !previousKeys.has(findingKey(f)) }));
}

function findingKey(f: Finding): string {
  return `${f.category}:${f.severity}:${f.url || ''}:${f.title}`;
}
