import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
  MouseRun,
  mouseLessons,
  mouseConfig,
  type MouseInput,
  type MouseSummary,
} from '@byte/shared';
import { db } from '../database/client.js';
import { cookieOptions } from '../middleware/security.js';
import { studentIdentity } from '../services/student.js';
import { newToken, hashToken } from '../services/auth.js';

const startSchema = z.object({
  lessonId: z.string(),
  doubleClickMs: z.number().int().min(300).max(1000).optional(),
});
const inputSchema = z.object({
  type: z.enum(['down', 'up', 'move', 'cancel', 'wheel']),
  button: z.number().int().min(-1).max(4),
  x: z.number().finite().min(-3000).max(4000),
  y: z.number().finite().min(-3000).max(4000),
  t: z.number().finite().min(0).max(14400000),
  deltaY: z.number().finite().min(-10000).max(10000).optional(),
});
type Control = { at: number; state: string };
function pausedAt(log: Control[], at: number) {
  return log.filter((c) => c.at <= at).at(-1)?.state === 'PAUSED';
}
export function gameRoutes() {
  const router = Router();
  router.post('/attempts', async (req, res) => {
    const body = startSchema.parse(req.body);
    const definition = mouseLessons.find((l) => l.id === body.lessonId);
    const lesson = await db.lesson.findUnique({ where: { id: body.lessonId } });
    if (!definition || !lesson?.available) {
      res.status(409).json({ error: 'Bài học chưa mở gameplay.' });
      return;
    }
    let identity = await studentIdentity(req);
    let sessionId: string | undefined;
    if (identity?.roomId) {
      const session = await db.roomSession.findFirstOrThrow({
        where: { roomId: identity.roomId },
        orderBy: { createdAt: 'desc' },
      });
      if (!['FINISHED', 'RESULT', 'LEADERBOARD'].includes(session.state)) {
        if (session.state !== 'PLAYING' || session.lessonId !== body.lessonId) {
          res.status(409).json({
            error: 'Phòng học chưa bắt đầu bài này. Hãy chờ thầy cô.',
          });
          return;
        }
        sessionId = session.id;
      }
    }
    if (!identity) {
      const token = newToken();
      const practice = await db.practiceIdentity.create({
        data: {
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + cookieOptions.maxAge),
          student: { create: { name: 'Tự luyện tập' } },
        },
      });
      identity = { studentId: practice.studentId, roomId: null };
      res.cookie('byte_practice', token, cookieOptions);
    }
    const attempt = await db.attempt.create({
      data: {
        studentId: identity.studentId,
        lessonId: lesson.id,
        sessionId,
        state: 'PLAYING',
        seed: randomInt(1, 1000000),
        skillId: definition.skill,
        levelId: String(definition.config.level),
        doubleClickMs: body.doubleClickMs ?? 650,
      },
    });
    res.status(201).json({
      id: attempt.id,
      lessonId: attempt.lessonId,
      startedAt: attempt.startedAt.toISOString(),
      seed: attempt.seed,
      doubleClickMs: attempt.doubleClickMs,
    });
  });
  router.post('/attempts/:id/pause', async (req, res) => {
    const body = z.object({ paused: z.boolean() }).parse(req.body);
    const identity = await studentIdentity(req);
    const attempt = await db.attempt.findFirst({
      where: {
        id: String(req.params.id),
        studentId: identity?.studentId ?? '',
      },
      include: { result: true },
    });
    if (!attempt) {
      res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
      return;
    }
    if (attempt.result) {
      res.status(409).json({ error: 'Lượt chơi đã kết thúc.' });
      return;
    }
    const log = JSON.parse(attempt.pauseLog) as Control[];
    const state = body.paused ? 'PAUSED' : 'PLAYING';
    if (log.at(-1)?.state !== state) log.push({ at: Date.now(), state });
    await db.attempt.update({
      where: { id: attempt.id },
      data: { pauseLog: JSON.stringify(log), state },
    });
    res.json({ paused: body.paused, serverTime: Date.now() });
  });
  router.post('/attempts/:id/result', async (req, res) => {
    const body = z
      .object({ events: z.array(inputSchema).max(6000) })
      .parse(req.body);
    const identity = await studentIdentity(req);
    const result = await db.$transaction(async (tx) => {
      const attempt = await tx.attempt.findFirst({
        where: {
          id: String(req.params.id),
          studentId: identity?.studentId ?? '',
        },
        include: { result: true, session: true },
      });
      if (!attempt) return null;
      // Same-attempt retries are idempotent, including a lost HTTP response.
      if (attempt.result) return attempt.result;
      const lesson = mouseLessons.find((l) => l.id === attempt.lessonId);
      if (!lesson) throw new Error('Bài học không hợp lệ.');
      const run = new MouseRun(
        mouseConfig(lesson, attempt.doubleClickMs),
        attempt.seed,
      );
      const controls = attempt.session
        ? (JSON.parse(attempt.session.controlLog) as Control[])
        : [];
      const local = JSON.parse(attempt.pauseLog) as Control[];
      let previous = -1;
      for (const event of body.events as MouseInput[]) {
        const wall = attempt.startedAt.getTime() + event.t;
        if (
          event.t < previous ||
          wall > Date.now() + 100 ||
          (event.type !== 'cancel' &&
            (pausedAt(local, wall) ||
              pausedAt(controls, wall) ||
              controls.some(
                (c) =>
                  ['FINISHED', 'RESULT', 'LEADERBOARD'].includes(c.state) &&
                  c.at <= wall,
              )))
        )
          throw new Error('Bài học có thao tác ngoài thời gian được phép.');
        // Cancellation is permitted during pause/end: it only clears a gesture.
        // A pause must break any partially held or double-click gesture.
        if (
          [...local, ...controls].some(
            (c) =>
              c.state === 'PAUSED' &&
              c.at > attempt.startedAt.getTime() + previous &&
              c.at <= wall,
          )
        )
          run.cancel();
        if (event.type === 'down' || event.type === 'wheel') {
          if (event.x < 0 || event.x > 960 || event.y < 0 || event.y > 560)
            throw new Error('Bài học có thao tác ngoài khu vườn.');
        }
        run.input(event);
        previous = event.t;
      }
      const elapsed = Math.max(0, Math.round(body.events.at(-1)?.t ?? 0));
      const boundaries = [
        ...new Set([
          attempt.startedAt.getTime(),
          attempt.startedAt.getTime() + elapsed,
          ...local.map((c) => c.at),
          ...controls.map((c) => c.at),
        ]),
      ]
        .filter(
          (at) =>
            at >= attempt.startedAt.getTime() &&
            at <= attempt.startedAt.getTime() + elapsed,
        )
        .sort((a, b) => a - b);
      let pauseMs = 0;
      for (let i = 0; i < boundaries.length - 1; i++) {
        const at = boundaries[i]!;
        if (pausedAt(local, at) || pausedAt(controls, at))
          pauseMs += boundaries[i + 1]! - at;
      }
      const summary: MouseSummary = run.summary(elapsed - pauseMs);
      const saved = await tx.result.create({
        data: {
          attemptId: attempt.id,
          ...summary,
          inputLog: JSON.stringify(body.events),
        },
      });
      await tx.attempt.update({
        where: { id: attempt.id },
        data: { state: 'RESULT' },
      });
      if (summary.passed) {
        const old = await tx.progress.findUnique({
          where: {
            studentId_lessonId: {
              studentId: attempt.studentId,
              lessonId: attempt.lessonId,
            },
          },
        });
        await tx.progress.upsert({
          where: {
            studentId_lessonId: {
              studentId: attempt.studentId,
              lessonId: attempt.lessonId,
            },
          },
          create: {
            studentId: attempt.studentId,
            lessonId: attempt.lessonId,
            completedCount: 1,
            bestScore: summary.score,
          },
          update: {
            completedCount: { increment: 1 },
            bestScore: Math.max(old?.bestScore ?? 0, summary.score),
          },
        });
      }
      if (summary.stars > 0) {
        const rewardId = lesson.rewards[0]!.id;
        const old = await tx.achievement.findUnique({
          where: {
            studentId_rewardId: { studentId: attempt.studentId, rewardId },
          },
        });
        await tx.achievement.upsert({
          where: {
            studentId_rewardId: { studentId: attempt.studentId, rewardId },
          },
          create: {
            studentId: attempt.studentId,
            rewardId,
            stars: summary.stars,
          },
          update: { stars: Math.max(old?.stars ?? 0, summary.stars) },
        });
      }
      return saved;
    });
    if (!result) {
      res.status(404).json({ error: 'Không tìm thấy lượt chơi.' });
      return;
    }
    res.json({
      id: result.id,
      attemptId: result.attemptId,
      score: result.score,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
      completedTargets: result.completedTargets,
      correctActions: result.correctActions,
      wrongActions: result.wrongActions,
      stars: result.stars,
      passed: result.passed,
      completedAt: result.createdAt,
    });
  });
  return router;
}
