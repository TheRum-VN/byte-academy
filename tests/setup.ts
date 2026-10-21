import {
  existsSync,
  mkdirSync,
  closeSync,
  openSync,
  unlinkSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const path = resolve('.local/vitest.db');
mkdirSync(resolve('.local'), { recursive: true });
if (existsSync(path)) unlinkSync(path);
closeSync(openSync(path, 'a'));
process.env.DATABASE_URL = `file:${path.replaceAll('\\', '/')}`;
process.env.NODE_ENV = 'test';
const migration = spawnSync(
  process.execPath,
  [
    'node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--schema',
    'apps/server/prisma/schema.prisma',
  ],
  { env: process.env, encoding: 'utf8' },
);
if (migration.status !== 0)
  throw new Error(migration.stdout + migration.stderr);
