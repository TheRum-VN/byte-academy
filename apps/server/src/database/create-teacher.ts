import { db } from './client.js';
import { hash } from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
const rl = createInterface({ input: stdin, output: stdout });
try {
  const username = z
    .string()
    .trim()
    .min(3)
    .max(40)
    .parse(await rl.question('Username: '));
  const name = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .parse(await rl.question('Teacher name: '));
  // Password can be piped through stdin; never passed as a shell argument or stored in source.
  const password = z
    .string()
    .min(12)
    .max(72)
    .parse(
      await rl.question('Password (12–72 characters; input is visible): '),
    );
  if (Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Password exceeds 72 UTF-8 bytes.');
  await db.teacher.create({
    data: { username, name, passwordHash: await hash(password, 12) },
  });
  console.log('Teacher created.');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Could not create teacher',
  );
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
