import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
// Built output is also one directory below apps/server.
export const env = z
  .object({
    DATABASE_URL: z.string().default('file:./byte.db'),
    PORT: z.coerce.number().default(3001),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APP_ORIGIN: z
      .string()
      .url()
      .default(
        `http://localhost:${process.env.NODE_ENV === 'production' ? (process.env.PORT ?? '3001') : '5173'}`,
      ),
    COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  })
  .parse(process.env);
process.env.DATABASE_URL = env.DATABASE_URL;
