import { chromium } from 'playwright';
import { LocalStorage } from 'pre-release-checker-storage';
import type { CrawlConfig, Scenario, ScenarioRunResult, ScenarioRunStepResult, ScenarioStep } from 'pre-release-checker-shared';
import { scenarioRunResultSchema } from 'pre-release-checker-shared';
import { isAllowedStagingUrl } from './guards.js';

interface ConsoleLog {
  level: string;
  message: string;
  location?: string;
}

export async function runScenario(
  scenario: Scenario,
  scenarioRunId: string,
  config: CrawlConfig
): Promise<{ result: ScenarioRunResult; error?: string }> {
  const envOrigins = process.env.ALLOWED_STAGING_ORIGINS?.split(',');
  if (!isAllowedStagingUrl(scenario.baseUrl, config, envOrigins)) {
    return {
      result: scenarioRunResultSchema.parse({ scenarioId: scenario.id, stepResults: [] }),
      error: '許可されていないオリジンです',
    };
  }

  const storage = new LocalStorage(process.env.STORAGE_LOCAL_PATH || '../../data/storage');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const consoleLogs: ConsoleLog[] = [];
  let hasJsError = false;
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
    consoleLogs.push({ level: 'pageerror', message: err.message, location: err.stack });
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      hasHttpError = true;
      consoleLogs.push({
        level: 'http-error',
        message: `${response.request().method()} ${response.url()} -> ${status}`,
      });
    }
  });

  const stepResults: ScenarioRunStepResult[] = [];

  try {
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const start = Date.now();
      const stepResult = await executeStep(page, step, i, storage, scenarioRunId);
      stepResult.durationMs = Date.now() - start;
      stepResults.push(stepResult);

      if (config.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.delayMs));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      result: scenarioRunResultSchema.parse({
        scenarioId: scenario.id,
        stepResults,
        consoleLogs,
        hasJsError,
        hasHttpError,
      }),
      error: message,
    };
  } finally {
    await browser.close();
  }

  return {
    result: scenarioRunResultSchema.parse({
      scenarioId: scenario.id,
      stepResults,
      consoleLogs,
      hasJsError,
      hasHttpError,
    }),
  };
}

async function executeStep(
  page: import('playwright').Page,
  step: ScenarioStep,
  index: number,
  storage: LocalStorage,
  scenarioRunId: string
): Promise<ScenarioRunStepResult> {
  const base: ScenarioRunStepResult = {
    stepIndex: index,
    status: 'ok',
    logs: [],
    screenshotPath: null,
  };

  const takeScreenshot = async () => {
    try {
      const buffer = await page.screenshot({ type: 'png' });
      return await storage.saveScreenshot(scenarioRunId, String(index), buffer);
    } catch {
      return null;
    }
  };

  try {
    switch (step.type) {
      case 'navigate':
        await page.goto(step.url, { waitUntil: 'networkidle', timeout: 30000 });
        break;
      case 'fill':
        await page.locator(step.selector).fill(step.value);
        break;
      case 'select':
        await page.locator(step.selector).selectOption(step.value);
        break;
      case 'click':
        await page.locator(step.selector).click();
        break;
      case 'submit': {
        if (step.selector) {
          const buttons = page.locator(step.selector);
          const count = await buttons.count();
          if (count > 0) {
            const waitForNav = page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
            await Promise.all([waitForNav, buttons.first().click()]);
          } else {
            await page.keyboard.press('Enter');
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          }
        } else {
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        }
        break;
      }
      case 'assertText':
        if (step.selector) {
          const text = await page.locator(step.selector).textContent();
          if (step.operator === 'contains') {
            if (!text || !text.includes(step.text)) {
              throw new Error(`Expected text "${step.text}" not found in ${step.selector}`);
            }
          } else {
            if (!text || text.trim().length === 0) {
              throw new Error(`No text found in ${step.selector}`);
            }
          }
        } else {
          const text = await page.content();
          if (step.operator === 'contains' && !text.includes(step.text)) {
            throw new Error(`Expected text "${step.text}" not found in page`);
          }
        }
        break;
      case 'reload':
        await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        break;
      case 'goBack':
        await page.goBack({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
        break;
      case 'goForward':
        await page.goForward({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
        break;
      case 'rapidClick': {
        const target = page.locator(step.selector).first();
        for (let i = 0; i < step.times; i++) {
          await target.click().catch(() => {});
        }
        break;
      }
      case 'clear':
        await page.locator(step.selector).fill('');
        break;
      case 'wait':
        await new Promise((resolve) => setTimeout(resolve, step.durationMs));
        break;
      default:
        break;
    }
    base.screenshotPath = await takeScreenshot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    base.status = 'failed';
    base.error = message;
    base.logs.push({ level: 'step-error', message });
    base.screenshotPath = await takeScreenshot();
  }

  return base;
}
