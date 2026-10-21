import type { RequestHandler } from 'express';
import { getTeacher } from '../services/auth.js';
import { env } from '../config/env.js';
export const requireTeacher: RequestHandler = async (req, res, next) => {
  const teacher = await getTeacher(req.cookies.byte_teacher);
  if (!teacher) {
    res.status(401).json({ error: 'Vui lòng đăng nhập giáo viên.' });
    return;
  }
  res.locals.teacher = teacher;
  next();
};
export const sameOrigin: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  // Browser mutations require the configured origin. CLI clients without Origin remain supported.
  if (req.headers.origin && req.headers.origin !== env.APP_ORIGIN) {
    res.status(403).json({ error: 'Origin không được phép.' });
    return;
  }
  next();
};
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};
