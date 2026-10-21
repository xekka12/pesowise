import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import * as helmetNs from 'helmet';
import { config, serverRootDir } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth, requireRequestHeader } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { budgetsRouter } from './routes/budgets.js';
import { categoriesRouter } from './routes/categories.js';
import { goalsRouter } from './routes/goals.js';
import { dashboardRouter, reportsRouter } from './routes/insights.js';
import { notificationsRouter } from './routes/notifications.js';
import { profileRouter } from './routes/profile.js';
import { recurringRouter } from './routes/recurring.js';
import { transactionsRouter } from './routes/transactions.js';
import { cronRouter } from './routes/cron.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmetNs.default({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.use(cors({ origin: isAllowedOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', requireRequestHeader);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'pesowise' });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/profile', requireAuth, profileRouter);
  app.use('/api/categories', requireAuth, categoriesRouter);
  app.use('/api/transactions', requireAuth, transactionsRouter);
  app.use('/api/budgets', requireAuth, budgetsRouter);
  app.use('/api/goals', requireAuth, goalsRouter);
  app.use('/api/recurring', requireAuth, recurringRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/reports', requireAuth, reportsRouter);
  app.use('/api/notifications', requireAuth, notificationsRouter);
  app.use('/api/cron', cronRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'That API route does not exist.' });
  });

  const clientDist = clientDistDir();
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next();
    });
  });

  app.use(errorHandler);
  return app;
}

function clientDistDir(): string {
  const candidates = [path.resolve(process.cwd(), 'client/dist'), path.resolve(serverRootDir, '../client/dist')];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? candidates[0];
}

function isAllowedOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  const allowed = new Set<string>([config.clientOrigin]);
  for (const host of [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) allowed.add(`https://${host}`);
  }
  callback(null, allowed.has(origin));
}
