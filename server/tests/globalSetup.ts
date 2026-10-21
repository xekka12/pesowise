import dotenv from 'dotenv';
import path from 'node:path';

export async function setup(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_DISABLED = 'true';
  process.env.EMBEDDED_POSTGRES = 'true';
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    process.env.SESSION_SECRET = 'test-session-secret-32-characters';
  }
  if (!process.env.DATABASE_URL_TEST?.includes('pesowise_test')) {
    throw new Error('Refusing to run tests without DATABASE_URL_TEST pointing at pesowise_test.');
  }
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  const postgres = await import('../src/lib/postgres.js');
  await postgres.ensurePostgres();
  postgres.migrateDatabase(process.env.DATABASE_URL);
}

export async function teardown(): Promise<void> {
  const postgres = await import('../src/lib/postgres.js');
  await postgres.stopEmbeddedPostgres();
}
