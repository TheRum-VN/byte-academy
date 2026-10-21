import {
  existsSync,
  copyFileSync,
  mkdirSync,
  openSync,
  closeSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = new URL('../apps/server/.env', import.meta.url);
if (!existsSync(envPath))
  copyFileSync(
    new URL('../apps/server/.env.example', import.meta.url),
    envPath,
  );
// Only create a missing default database; never truncate an existing file.
const db = new URL('../apps/server/prisma/byte.db', import.meta.url);
if (!existsSync(db)) {
  mkdirSync(new URL('../apps/server/prisma', import.meta.url), {
    recursive: true,
  });
  closeSync(openSync(db, 'a'));
}
const commands = [
  ['run', 'build', '-w', '@byte/shared'],
  ['run', 'db:generate'],
  ['run', 'db:migrate'],
  ['run', 'db:seed'],
];
for (const args of process.argv.includes('--generate-only')
  ? commands.slice(0, 2)
  : commands) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run setup through npm run setup.');
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
