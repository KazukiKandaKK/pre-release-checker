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

    const steps: ScenarioStep[] = [{ type: 'navigate', url: pageUrl }];

    for (const input of form.inputs) {
      const value = inferInputValue(input);
      if (value === null) continue;
      if (input.isSelect) {
        steps.push({ type: 'select', selector: input.selector, value, label: input.name || input.type });
      } else {
        steps.push({ type: 'fill', selector: input.selector, value, label: input.name || input.type });
      }
    }

    steps.push({ type: 'submit', selector: form.selector, label: 'submit' });

    const input = scenarioInputSchema.parse({
      name: `Form on ${new URL(pageUrl).pathname || pageUrl}`,
      description: `Auto-generated scenario for form with action ${form.action}`,
      risk,
      status: risk === 'safe' ? 'active' : 'disabled',
      baseUrl,
      pageUrl,
      steps,
    });

    const row = await prisma.scenario.create({
      data: {
        ...input,
        steps: JSON.stringify(input.steps),
        source: 'auto',
        runId,
      },
    });

    scenarios.push(scenarioSchema.parse({ ...row, steps: JSON.parse(row.steps) }));
  }

  return scenarios;
}

function inferInputValue(input: RawInput): string | null {
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
