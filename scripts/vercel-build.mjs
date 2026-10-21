import { spawnSync } from 'node:child_process';

function run(args, env = process.env) {
  const result = spawnSync('npm', args, { stdio: 'inherit', env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function directDatabaseUrl(value) {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  if (!value) return value;
  const parsed = new URL(value);
  parsed.hostname = parsed.hostname.replace('-pooler', '');
  parsed.searchParams.delete('channel_binding');
  parsed.searchParams.delete('pgbouncer');
  parsed.searchParams.set('sslmode', 'require');
  return parsed.toString();
}

run(['run', 'build', '-w', 'client']);
run(['exec', '-w', 'server', '--', 'prisma', 'generate']);
run([
  'exec',
  '-w',
  'server',
  '--',
  'esbuild',
  'src/vercel.ts',
  '--bundle',
  '--platform=node',
  '--format=esm',
  '--outfile=dist/vercel.js',
  '--packages=external',
  '--alias:@pesowise/shared=../shared/src/index.ts',
]);
run(['exec', '-w', 'server', '--', 'prisma', 'migrate', 'deploy'], {
  ...process.env,
  DATABASE_URL: directDatabaseUrl(process.env.DATABASE_URL),
});
