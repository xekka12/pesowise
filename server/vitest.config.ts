import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, '.env') });

const testUrl = process.env.DATABASE_URL_TEST ?? '';
if (!testUrl.includes('pesowise_test')) {
  throw new Error('DATABASE_URL_TEST must point at the pesowise_test database.');
}

const sessionSecret = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
  ? process.env.SESSION_SECRET
  : 'test-session-secret-32-characters';

export default defineConfig({
  resolve: {
    alias: {
      '@pesowise/shared': path.resolve(root, '../shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    globalSetup: './tests/globalSetup.ts',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testUrl,
      DATABASE_URL_TEST: testUrl,
      RATE_LIMIT_DISABLED: 'true',
      SESSION_SECRET: sessionSecret,
      CLIENT_ORIGIN: 'http://localhost:5173',
      EMBEDDED_POSTGRES: 'true',
    },
  },
});
