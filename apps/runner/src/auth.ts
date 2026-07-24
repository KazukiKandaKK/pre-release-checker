import type { BrowserContext, Page } from 'playwright';
import type { CrawlConfig } from 'pre-release-checker-shared';

export async function authenticateContext(context: BrowserContext, config: CrawlConfig): Promise<void> {
  if (config.authType === 'none') return;

  if (config.authType === 'basic') {
    if (config.authUsername && config.authPassword) {
      await context.setHTTPCredentials({ username: config.authUsername, password: config.authPassword });
    }
    return;
  }

  if (config.authType === 'oauth') {
    if (config.authToken) {
      await context.setExtraHTTPHeaders({ Authorization: `Bearer ${config.authToken}` });
    }
    return;
  }

  if (config.authType === 'cookie') {
    if (config.authCookie) {
      const url = new URL(config.baseUrl);
      const cookies = parseCookieString(config.authCookie, url.hostname, url.pathname || '/');
      await context.addCookies(cookies);
    }
    return;
  }
}

export async function performFormLogin(page: Page, config: CrawlConfig): Promise<void> {
  if (config.authType !== 'password' || !config.authLoginUrl) return;

  const loginUrl = config.authLoginUrl || config.baseUrl;
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

  const usernameSelectors = ['input[name="username"]', 'input[name="email"]', 'input[type="email"]', 'input[name="user"]', 'input[name="id"]', 'input[name="login"]'];
  const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[name="pass"]', 'input[name="passwd"]'];
  const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("ログイン")', 'button:has-text("Login")'];

  for (const selector of usernameSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await page.locator(selector).first().fill(config.authUsername || '');
      break;
    }
  }

  for (const selector of passwordSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await page.locator(selector).first().fill(config.authPassword || '');
      break;
    }
  }

  for (const selector of submitSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      const waitForNav = page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
      await Promise.all([waitForNav, page.locator(selector).first().click()]);
      break;
    }
  }
}

function parseCookieString(cookieString: string, domain: string, path: string) {
  const cookies: { name: string; value: string; domain: string; path: string }[] = [];
  for (const part of cookieString.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (!name) continue;
    cookies.push({
      name: name.trim(),
      value: rest.join('=').trim(),
      domain,
      path,
    });
  }
  return cookies;
}
