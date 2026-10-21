import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const pooled = parsed.hostname.includes('-pooler') || parsed.searchParams.get('pgbouncer') === 'true';
    if (pooled) {
      parsed.searchParams.set('pgbouncer', 'true');
      parsed.searchParams.set('connection_limit', '1');
      parsed.searchParams.delete('channel_binding');
      process.env.DATABASE_URL = parsed.toString();
    }
  } catch {
    // Keep the original connection string when it is not a URL.
  }
}

export const prisma = new PrismaClient();
