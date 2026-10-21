import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters.'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  RATE_LIMIT_DISABLED: z.enum(['true', 'false']).optional(),
  EMBEDDED_POSTGRES: z.enum(['true', 'false']).optional(),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.parse(process.env);

export const serverRootDir = serverRoot;

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  databaseUrl: parsed.DATABASE_URL,
  sessionSecret: parsed.SESSION_SECRET,
  clientOrigin: parsed.CLIENT_ORIGIN,
  cookieSecure: parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === 'true' : parsed.NODE_ENV === 'production',
  rateLimitDisabled: parsed.RATE_LIMIT_DISABLED === 'true' || parsed.NODE_ENV === 'test',
  embeddedPostgres: parsed.EMBEDDED_POSTGRES !== 'false' && parsed.NODE_ENV !== 'production',
  authRateLimit: parsed.AUTH_RATE_LIMIT,
  sessionDays: 14,
};

export const COOKIE_NAME = 'pesowise.sid';
