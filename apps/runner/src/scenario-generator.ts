import type { Page as PlaywrightPage } from 'playwright';
import { prisma } from 'pre-release-checker-database';
import { scenarioInputSchema, scenarioSchema, type CrawlConfig, type Scenario, type ScenarioStep } from 'pre-release-checker-shared';
import { isAllowedStagingUrl, isExcluded } from './guards.js';

interface RawInput {
  name?: string;
  type: string;
  tagName: string;
  isSelect: boolean;
  required: boolean;
  selector: string;
}

interface RawForm {
  action: string;
  method: string;
  selector: string;
  inputs: RawInput[];
  hasPassword: boolean;
}

export async function generateScenariosFromPage(
  page: PlaywrightPage,
  pageUrl: string,
  baseUrl: string,
  config: CrawlConfig,
  runId: string
): Promise<Scenario[]> {
  const envOrigins = process.env.ALLOWED_STAGING_ORIGINS?.split(',');

  const forms = await page.$$eval('form', (forms: HTMLFormElement[], ctx: { baseUrl: string; pageUrl: string }) => {
    return forms.map((form, formIndex) => {
      const action = form.getAttribute('action') || '';
      const method = (form.getAttribute('method') || 'GET').toUpperCase();
      const resolvedAction = action ? new URL(action, ctx.baseUrl).href : ctx.pageUrl;
      const formSelector = `form:nth-of-type(${formIndex + 1})`;

      const inputs: RawInput[] = [];
      let hasPassword = false;

      const elements = form.querySelectorAll('input, select, textarea');
      elements.forEach((el) => {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'input') {
          const input = el as HTMLInputElement;
          if (input.type === 'password') hasPassword = true;
          const inputIndex = Array.from(form.querySelectorAll('input')).indexOf(input) + 1;
          const inputSelector = input.name
            ? `${formSelector} input[name="${CSS.escape(input.name)}"]`
            : `${formSelector} input:nth-of-type(${inputIndex})`;
          inputs.push({
            name: input.name,
            type: input.type,
            tagName,
            isSelect: false,
            required: input.required,
            selector: inputSelector,
          });
        } else if (tagName === 'select') {
          const select = el as HTMLSelectElement;
          const selectIndex = Array.from(form.querySelectorAll('select')).indexOf(select) + 1;
          const inputSelector = select.name
            ? `${formSelector} select[name="${CSS.escape(select.name)}"]`
            : `${formSelector} select:nth-of-type(${selectIndex})`;
          inputs.push({
            name: select.name,
            type: 'select',
            tagName,
            isSelect: true,
            required: select.required,
            selector: inputSelector,
          });
        } else if (tagName === 'textarea') {
          const textarea = el as HTMLTextAreaElement;
          const textareaIndex = Array.from(form.querySelectorAll('textarea')).indexOf(textarea) + 1;
          const inputSelector = textarea.name
            ? `${formSelector} textarea[name="${CSS.escape(textarea.name)}"]`
            : `${formSelector} textarea:nth-of-type(${textareaIndex})`;
          inputs.push({
            name: textarea.name,
            type: 'textarea',
            tagName,
            isSelect: false,
            required: textarea.required,
            selector: inputSelector,
          });
        }
      });

      const hasSubmitButton = form.querySelector('button[type="submit"], input[type="submit"]') !== null;
      const submitSelector = hasSubmitButton
        ? `${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`
        : '';

      return {
        action: resolvedAction,
        method,
        selector: submitSelector,
        inputs,
        hasPassword,
      } as RawForm;
    });
  }, { baseUrl, pageUrl });

  const scenarios: Scenario[] = [];

  for (const form of forms) {
    if (!isAllowedStagingUrl(form.action, config, envOrigins)) continue;
    if (isExcluded(form.action, config)) continue;

    let risk: Scenario['risk'] = 'safe';
    if (form.hasPassword) {
      risk = 'needs-auth';
    }

    const baseName = `Form on ${new URL(pageUrl).pathname || pageUrl}`;

    const normalSteps = buildFillSteps(form.inputs, 'normal').concat([{ type: 'submit' as const, selector: form.selector, label: 'submit' }]);
    scenarios.push(await saveScenario({
      name: baseName,
      description: `Auto-generated normal scenario for form with action ${form.action}`,
      risk,
      status: risk === 'safe' ? 'active' : 'disabled',
      baseUrl,
      pageUrl,
      steps: [{ type: 'navigate' as const, url: pageUrl }, ...normalSteps],
    }, runId));

    if (risk !== 'safe') continue;

    const emptySteps = buildFillSteps(form.inputs, 'empty').concat([{ type: 'submit' as const, selector: form.selector, label: 'submit' }]);
    scenarios.push(await saveScenario({
      name: `Empty values: ${baseName}`,
      description: `Abnormal data scenario with empty values for form ${form.action}`,
      risk,
      status: 'active',
      baseUrl,
      pageUrl,
      steps: [{ type: 'navigate' as const, url: pageUrl }, ...emptySteps],
    }, runId));

    const invalidSteps = buildFillSteps(form.inputs, 'invalid').concat([{ type: 'submit' as const, selector: form.selector, label: 'submit' }]);
    scenarios.push(await saveScenario({
      name: `Invalid values: ${baseName}`,
      description: `Abnormal data scenario with invalid values for form ${form.action}`,
      risk,
      status: 'active',
      baseUrl,
      pageUrl,
      steps: [{ type: 'navigate' as const, url: pageUrl }, ...invalidSteps],
    }, runId));

    const doubleSubmitSteps = buildFillSteps(form.inputs, 'normal').concat([
      { type: 'submit' as const, selector: form.selector, label: 'submit' },
      { type: 'wait' as const, durationMs: 300, label: 'wait' },
      { type: 'navigate' as const, url: pageUrl, label: 'return to form' },
      { type: 'wait' as const, durationMs: 300, label: 'wait' },
      ...buildFillSteps(form.inputs, 'normal'),
      { type: 'submit' as const, selector: form.selector, label: 'submit again' },
    ]);
    scenarios.push(await saveScenario({
      name: `Double submit: ${baseName}`,
      description: `Abnormal operation scenario: submit the form twice for ${form.action}`,
      risk,
      status: 'active',
      baseUrl,
      pageUrl,
      steps: [{ type: 'navigate' as const, url: pageUrl }, ...doubleSubmitSteps],
    }, runId));

    const backAndResubmitSteps = buildFillSteps(form.inputs, 'normal').concat([
      { type: 'submit' as const, selector: form.selector, label: 'submit' },
      { type: 'wait' as const, durationMs: 300, label: 'wait' },
      { type: 'goBack' as const, label: 'back' },
      { type: 'wait' as const, durationMs: 300, label: 'wait' },
      { type: 'submit' as const, selector: form.selector, label: 'resubmit' },
    ]);
    scenarios.push(await saveScenario({
      name: `Back and resubmit: ${baseName}`,
      description: `Abnormal operation scenario: submit, go back, and resubmit for ${form.action}`,
      risk,
      status: 'active',
      baseUrl,
      pageUrl,
      steps: [{ type: 'navigate' as const, url: pageUrl }, ...backAndResubmitSteps],
    }, runId));
  }

  return scenarios;
}

function buildFillSteps(inputs: RawInput[], variant: 'normal' | 'empty' | 'invalid'): ScenarioStep[] {
  const steps: ScenarioStep[] = [];
  for (const input of inputs) {
    const value = variant === 'normal' ? inferNormalValue(input) : inferAbnormalValue(input, variant);
    if (value === null) continue;
    if (input.isSelect) {
      steps.push({ type: 'select', selector: input.selector, value, label: input.name || input.type });
    } else {
      steps.push({ type: 'fill', selector: input.selector, value, label: input.name || input.type });
    }
  }
  return steps;
}

async function saveScenario(input: {
  name: string;
  description: string;
  risk: Scenario['risk'];
  status: 'active' | 'disabled';
  baseUrl: string;
  pageUrl: string;
  steps: ScenarioStep[];
}, runId: string): Promise<Scenario> {
  const parsed = scenarioInputSchema.parse(input);
  const row = await prisma.scenario.create({
    data: {
      ...parsed,
      steps: JSON.stringify(parsed.steps),
      source: 'auto',
      runId,
    },
  });
  return scenarioSchema.parse({ ...row, steps: JSON.parse(row.steps) });
}

function inferNormalValue(input: RawInput): string | null {
  if (input.isSelect) return '1';
  if (input.type === 'email') return 'test@example.com';
  if (input.type === 'password') return 'TestPassword123!';
  if (input.type === 'tel') return '09012345678';
  if (input.type === 'url') return 'https://example.com';
  if (input.type === 'number') return '123';
  if (input.type === 'search') return 'query';
  if (input.type === 'textarea' || input.type === 'text') {
    if (input.name) {
      const lower = input.name.toLowerCase();
      if (lower.includes('mail')) return 'test@example.com';
      if (lower.includes('phone') || lower.includes('tel')) return '09012345678';
      if (lower.includes('url')) return 'https://example.com';
      if (lower.includes('name')) return 'テスト太郎';
    }
    return 'テスト';
  }
  return null;
}

function inferAbnormalValue(input: RawInput, variant: 'empty' | 'invalid'): string | null {
  if (input.isSelect) return variant === 'empty' ? '1' : '1';
  if (variant === 'empty') return '';

  if (input.type === 'email') return 'not-an-email';
  if (input.type === 'password') return '123';
  if (input.type === 'tel') return 'abc';
  if (input.type === 'url') return 'not-a-url';
  if (input.type === 'number') return '-99999999999999999999';
  if (input.type === 'search') return '"><script>alert(1)</script>';
  if (input.type === 'textarea' || input.type === 'text') {
    return "'; DROP TABLE users; -- 🍣<script>alert('xss')</script>";
  }
  return null;
}
