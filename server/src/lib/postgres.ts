import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { config, serverRootDir } from '../config.js';

let embedded: EmbeddedPostgres | null = null;
let startedByProcess = false;

export async function canConnect(connectionString: string): Promise<boolean> {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 1500 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function ensurePostgres(): Promise<void> {
  if (await serverIsUp()) {
    await ensureDatabases();
    return;
  }
  if (!config.embeddedPostgres) {
    throw new Error('PostgreSQL is not reachable. Start it, or set EMBEDDED_POSTGRES=true for a local development database.');
  }
  const parsed = new URL(config.databaseUrl);
  const databaseDir = path.join(serverRootDir, '.pgdata');
  fs.mkdirSync(databaseDir, { recursive: true });
  embedded = new EmbeddedPostgres({
    databaseDir,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-c', 'timezone=UTC'],
    onLog: () => undefined,
    onError: (message) => {
      const text = String(message);
      if (!/already exists/i.test(text)) console.error(text);
    },
  });
  if (!fs.existsSync(path.join(databaseDir, 'PG_VERSION'))) {
    await embedded.initialise();
  }
  await embedded.start();
  startedByProcess = true;
  await ensureDatabases();
}

async function ensureDatabases(): Promise<void> {
  const client = await connectAdmin();
  try {
    for (const name of ['pesowise', 'pesowise_test']) {
      const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      if (existing.rowCount === 0) {
        await client.query(`CREATE DATABASE "${name}" ENCODING 'UTF8' TEMPLATE template0`);
      }
    }
    const encoding = await client.query<{ server_encoding: string }>('SHOW server_encoding');
    const serverEncoding = encoding.rows[0]?.server_encoding;
    if (serverEncoding !== 'UTF8') {
      throw new Error(
        `PostgreSQL is using ${serverEncoding ?? 'an unknown encoding'}. PesoWise stores UTF-8 text, including the peso sign. Stop the database and delete server/.pgdata if this is the local embedded cluster, then start again.`,
      );
    }
  } finally {
    await client.end();
  }
}

async function serverIsUp(): Promise<boolean> {
  try {
    const client = await connectAdmin();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function connectAdmin(): Promise<pg.Client> {
  const parsed = new URL(config.databaseUrl);
  const names = [decodeURIComponent(parsed.username), 'postgres', parsed.pathname.replace(/^\//, '')];
  let lastError: unknown;
  for (const name of names) {
    const url = new URL(config.databaseUrl);
    url.pathname = `/${name}`;
    const client = new pg.Client({ connectionString: url.toString() });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }
  throw lastError;
}

export async function stopEmbeddedPostgres(): Promise<void> {
  if (!startedByProcess || !embedded) return;
  await embedded.stop();
  startedByProcess = false;
  embedded = null;
}

export function migrateDatabase(databaseUrl: string): void {
  execSync('npx prisma migrate deploy', {
    cwd: serverRootDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
