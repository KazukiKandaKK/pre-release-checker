import { execSync } from 'node:child_process';
import path from 'node:path';

const testDb = path.resolve(process.cwd(), 'test.db');

process.env.DATABASE_URL = `file:${testDb}`;
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.STORAGE_LOCAL_PATH = path.resolve(process.cwd(), 'test-storage');
process.env.APP_MASTER_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

const schemaPath = path.resolve(process.cwd(), '../../packages/database/prisma/schema.prisma');

execSync(`npx --yes prisma migrate deploy --schema=${schemaPath}`, {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: `file:${testDb}` },
});
