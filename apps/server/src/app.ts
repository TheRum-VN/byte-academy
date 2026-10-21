import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { env } from './config/env.js';
import { sameOrigin } from './middleware/security.js';
import { api } from './routes/api.js';
import type { RoomSnapshot } from '@byte/shared';
export function createApp(broadcast: (room: RoomSnapshot) => void = () => {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'", 'ws:', 'wss:'],
          'upgrade-insecure-requests': env.COOKIE_SECURE === 'true' ? [] : null,
        },
      },
      strictTransportSecurity: env.COOKIE_SECURE === 'true' ? undefined : false,
    }),
  );
  app.use(express.json({ limit: '512kb' }), cookieParser(), sameOrigin);
  app.use('/api', api(broadcast));
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: 'API không tồn tại.' }),
  );
  if (env.NODE_ENV === 'production') {
    const web = fileURLToPath(new URL('../../web/dist', import.meta.url));
    if (!existsSync(web))
      throw new Error('Run npm run build before starting production.');
    app.use(express.static(web, { index: false }));
    app.get('/dev/assets', (_req, res) => res.sendStatus(404));
    app.get('/{*path}', (req, res) => {
      if (req.path.startsWith('/assets/')) {
        res.sendStatus(404);
        return;
      }
      res.sendFile(`${web}/index.html`);
    });
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Dữ liệu chưa đúng định dạng.',
          details: error.flatten(),
        });
        return;
      }
      if (
        error instanceof Error &&
        (error.message.startsWith('Invalid') ||
          error.message.startsWith('Bài học') ||
          error.message.startsWith('Phòng'))
      ) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: 'JSON không hợp lệ.' });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Có lỗi máy chủ. Vui lòng thử lại.' });
    },
  );
  return app;
}
