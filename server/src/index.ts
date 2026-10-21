import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { processDueRecurring } from './services/recurring.js';

async function waitForDatabase(): Promise<void> {
  const attempts = config.nodeEnv === 'production' ? 2 : 40;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const rows = await prisma.$queryRaw<Array<{ ready: string | null }>>`SELECT CAST(to_regclass('public.users') AS text) AS ready`;
      if (!rows[0]?.ready) throw new Error('Database schema is not ready.');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.error('Could not connect to PostgreSQL. Check DATABASE_URL and that the database is running.');
  if (config.nodeEnv !== 'production') console.error(lastError);
  process.exit(1);
}

function startRecurringJob(): void {
  const run = () => {
    processDueRecurring().catch((error) => {
      console.error('Recurring job failed.');
      if (config.nodeEnv !== 'production') console.error(error);
    });
  };
  run();
  const timer = setInterval(run, 15 * 60 * 1000);
  timer.unref();
}

if (!process.env.VERCEL) {
  await waitForDatabase();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`PesoWise API listening on http://localhost:${config.port}`);
  });
  if (config.nodeEnv !== 'test') startRecurringJob();
}
