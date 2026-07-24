import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StorageInterface } from './interface.js';

export class LocalStorage implements StorageInterface {
  constructor(private readonly basePath: string) {}

  private resolvePath(runId: string, pageId: string): string {
    const safeRunId = path.basename(runId);
    const safePageId = `${path.basename(pageId)}.png`;
    return path.join(this.basePath, safeRunId, safePageId);
  }

  async saveScreenshot(runId: string, pageId: string, data: Buffer): Promise<string> {
    const filePath = this.resolvePath(runId, pageId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return filePath;
  }

  async getScreenshot(runId: string, pageId: string): Promise<Buffer | null> {
    try {
      const filePath = this.resolvePath(runId, pageId);
      return await readFile(filePath);
    } catch {
      return null;
    }
  }
}
