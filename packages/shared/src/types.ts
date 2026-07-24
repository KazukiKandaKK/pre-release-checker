import { z } from 'zod';
import * as schemas from './schemas.js';

export type ConfigInput = z.infer<typeof schemas.configInputSchema>;
export type Config = z.infer<typeof schemas.configSchema>;
export type CrawlConfig = Omit<Config, 'id' | 'createdAt' | 'updatedAt'>;
export type PageSnapshot = z.infer<typeof schemas.pageSnapshotSchema>;
export type RunStatus = z.infer<typeof schemas.runStatusSchema>;
export type Run = z.infer<typeof schemas.runSchema>;
export type Page = z.infer<typeof schemas.pageSchema>;
export type CreateRunInput = z.infer<typeof schemas.createRunSchema>;
export type JobDto = z.infer<typeof schemas.jobSchema>;
