import { config } from '../config.js';
import { canConnect, ensurePostgres, migrateDatabase, stopEmbeddedPostgres } from '../lib/postgres.js';

const alreadyRunning = await canConnect(config.databaseUrl);
await ensurePostgres();
migrateDatabase(config.databaseUrl);
if (process.env.DATABASE_URL_TEST) migrateDatabase(process.env.DATABASE_URL_TEST);
console.log(alreadyRunning ? 'PostgreSQL is ready.' : 'Embedded PostgreSQL is ready.');

const shutdown = async () => {
  await stopEmbeddedPostgres();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
await new Promise(() => undefined);
