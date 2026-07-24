export interface StorageInterface {
  saveScreenshot(runId: string, pageId: string, data: Buffer): Promise<string>;
  getScreenshot(runId: string, pageId: string): Promise<Buffer | null>;
}
