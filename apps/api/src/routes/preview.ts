import { Router } from 'express';
import { chromium } from 'playwright';
import { z } from 'zod';
import { URL } from 'node:url';
import { parseOrigins } from 'pre-release-checker-shared';
import { getConfig } from '../services/config.js';
import { validate } from '../middleware/validate.js';

const previewSchema = z.object({
  url: z.string().url(),
});

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isAllowedStagingUrl(url: string, allowedOrigins: string, envOrigins?: string[]): boolean {
  const origin = getOrigin(url);
  if (!origin) return false;

  const allowed = new Set(parseOrigins(allowedOrigins));
  if (envOrigins) {
    for (const o of envOrigins) {
      if (o.trim()) allowed.add(o.trim());
    }
  }
  if (allowed.size === 0) return false;

  return allowed.has(origin);
}

export const previewRouter = Router();

previewRouter.post('/', validate(previewSchema), async (req, res, next) => {
  try {
    const config = await getConfig();
    if (!config) {
      res.status(400).json({ error: 'ConfigRequired', message: '先に設定を保存してください' });
      return;
    }

    const envOrigins = process.env.ALLOWED_STAGING_ORIGINS?.split(',');
    if (!isAllowedStagingUrl(req.body.url, config.allowedOrigins, envOrigins)) {
      res.status(400).json({ error: 'NotAllowed', message: '許可されていないオリジンです' });
      return;
    }

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: DEFAULT_VIEWPORT });
      const page = await context.newPage();
      await page.goto(req.body.url, { waitUntil: 'networkidle', timeout: 30000 });
      const buffer = await page.screenshot({ type: 'png' });
      res.json({
        screenshot: buffer.toString('base64'),
        viewport: DEFAULT_VIEWPORT,
      });
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    next(err);
  }
});
