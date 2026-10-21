import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  mkdirSync,
  existsSync,
  unlinkSync,
  openSync,
  closeSync,
} from 'node:fs';
mkdirSync('.local', { recursive: true });
const file = resolve('.local/e2e.db');
if (existsSync(file)) unlinkSync(file);
closeSync(openSync(file, 'a'));
const env = {
  ...process.env,
  DATABASE_URL: `file:${file.replaceAll('\\', '/')}`,
  NODE_ENV: 'production',
  PORT: '3101',
  HOST: '127.0.0.1',
  APP_ORIGIN: 'http://127.0.0.1:3101',
};
for (const args of [
  [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--schema',
    'apps/server/prisma/schema.prisma',
  ],
  ['--import', 'tsx', 'scripts/e2e-seed.ts'],
]) {
  const p = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (p.status !== 0) process.exit(p.status ?? 1);
}
const child = spawn(process.execPath, ['apps/server/dist/index.js'], {
  env,
  stdio: 'inherit',
});
process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => child.kill());
child.on('exit', (code) => process.exit(code ?? 0));
