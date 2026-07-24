import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { LocalStorage } from './local.js';

const tmpDir = path.join(process.cwd(), 'tmp-test-storage');

describe('LocalStorage', () => {
  beforeEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('saves and retrieves a PNG buffer', async () => {
    const storage = new LocalStorage(tmpDir);
    const data = Buffer.from('fake-png');
    const filePath = await storage.saveScreenshot('run1', 'page1', data);
    expect(filePath).toContain('run1/page1.png');
    const retrieved = await storage.getScreenshot('run1', 'page1');
    expect(retrieved?.toString()).toBe(data.toString());
  });

  it('returns null for missing screenshots', async () => {
    const storage = new LocalStorage(tmpDir);
    const result = await storage.getScreenshot('run1', 'missing');
    expect(result).toBeNull();
  });
});
