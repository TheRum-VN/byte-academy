import { Router } from 'express';
import { z } from 'zod';
import {
  TypingRun,
  typingLessons,
  typingConfig,
  type TypingConfig,
} from '@byte/shared';
import { db } from '../database/client.js';
import { studentIdentity } from '../services/student.js';
import { hashToken, newToken } from '../services/auth.js';
import { cookieOptions } from '../middleware/security.js';
const startSchema = z.object({
  lessonId: z.string(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[\p{L}\p{M} ]+$/u)
    .optional(),
});
const eventSchema = z.object({
  t: z.number().finite().min(0).max(14400000),
  type: z.enum(['down', 'up', 'clear', 'text', 'mode', 'finish']),
  code: z.string().max(30).optional(),
  key: z.string().max(30).optional(),
  repeat: z.boolean().optional(),
  ctrlKey: z.boolean().optional(),
  altKey: z.boolean().optional(),
  metaKey: z.boolean().optional(),
  isComposing: z.boolean().optional(),
  value: z.string().max(2000).optional(),
  mode: z.enum(['system', 'integrated']).optional(),
  method: z.enum(['telex', 'vni']).optional(),
});
type Control = { at: number; state: string };
const stateAt = (controls: Control[], at: number) =>
  controls.filter((c) => c.at <= at).at(-1)?.state;
export function typingRoutes() {
  const router = Router();
  router.post('/typing/attempts', async (req, res) => {
    const body = startSchema.parse(req.body),
      definition = typingLessons.find((l) => l.id === body.lessonId);
    const stored = await db.lesson.findUnique({ where: { id: body.lessonId } });
    if (!definition || !stored?.available) {
      res.status(409).json({ error: 'Bài học chưa mở.' });
      return;
    }
    const config = { ...typingConfig(definition) };
    if (config.personalName) {
      if (!body.name) {
        res.status(400).json({ error: 'Hãy nhập tên của em.' });
        return;
      }
      config.target = body.name.normalize('NFC');
    }
    let identity = await studentIdentity(req);
    let sessionId: string | undefined;
    if (identity?.roomId) {
      const session = await db.roomSession.findFirstOrThrow({
        where: { roomId: identity.roomId },
        orderBy: { createdAt: 'desc' },
      });
      if (!['FINISHED', 'RESULT', 'LEADERBOARD'].includes(session.state)) {
        if (session.state !== 'PLAYING' || session.lessonId !== definition.id) {
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
        lessonId: definition.id,
        sessionId,
        state: 'PLAYING',
        skillId: definition.skill,
        levelId: '1',
        typingConfig: JSON.stringify(config),
      },
    });
    res.status(201).json({
      id: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      serverTime: Date.now(),
      roomSessionId: sessionId ?? null,
      config,
    });
  });
  router.post('/typing/attempts/:id/result', async (req, res) => {
    const body = z
        .object({ events: z.array(eventSchema).max(6000) })
        .parse(req.body),
      identity = await studentIdentity(req);
    const result = await db.$transaction(async (tx) => {
      const attempt = await tx.attempt.findFirst({
        where: {
          id: String(req.params.id),
          studentId: identity?.studentId ?? '',
        },
        include: { result: true, session: true },
      });
      if (!attempt) return null;
      if (!typingLessons.some((l) => l.id === attempt.lessonId))
        throw new Error('Bài học không hợp lệ.');
      if (attempt.result) return attempt.result;
      const definition = typingLessons.find((l) => l.id === attempt.lessonId)!;
      const config = JSON.parse(attempt.typingConfig) as TypingConfig;
      const run = new TypingRun(config, definition.completionRules.minAccuracy);
      const local = JSON.parse(attempt.pauseLog) as Control[],
        room = attempt.session
          ? (JSON.parse(attempt.session.controlLog) as Control[])
          : [];
      const start = attempt.startedAt.getTime();
      let previous = -1;
      for (const event of body.events) {
        const wall = start + event.t;
        const blocked =
          stateAt(local, wall) === 'PAUSED' ||
          ['PAUSED', 'FINISHED', 'RESULT', 'LEADERBOARD'].includes(
            stateAt(room, wall) ?? '',
          );
        if (
          event.t < previous ||
          wall > Date.now() + 100 ||
          (blocked && !['clear', 'up', 'finish'].includes(event.type))
        )
          throw new Error('Bài học có thao tác ngoài thời gian được phép.');
        if (
          [...local, ...room].some(
            (c) =>
              c.state === 'PAUSED' && c.at > start + previous && c.at <= wall,
          )
        )
          run.keyboard.clear();
        run.input(event);
        previous = event.t;
      }
      const first = start + (run.first ?? run.last),
        last = start + run.last;
      const boundaries = [
        ...new Set([
          first,
          last,
          ...local.map((c) => c.at),
          ...room.map((c) => c.at),
        ]),
      ]
        .filter((t) => t >= first && t <= last)
        .sort((a, b) => a - b);
      let paused = 0;
      for (let i = 0; i < boundaries.length - 1; i++)
        if (
          stateAt(local, boundaries[i]!) === 'PAUSED' ||
          ['PAUSED', 'FINISHED', 'RESULT', 'LEADERBOARD'].includes(
            stateAt(room, boundaries[i]!) ?? '',
          )
        )
          paused += boundaries[i + 1]! - boundaries[i]!;
      const summary = run.summary(Math.max(0, last - first - paused));
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
        const key = {
          studentId: attempt.studentId,
          lessonId: attempt.lessonId,
        };
        const old = await tx.progress.findUnique({
          where: { studentId_lessonId: key },
        });
        await tx.progress.upsert({
          where: { studentId_lessonId: key },
          create: { ...key, completedCount: 1, bestScore: summary.score },
          update: {
            completedCount: { increment: 1 },
            bestScore: Math.max(old?.bestScore ?? 0, summary.score),
          },
        });
        const reward = {
          studentId: attempt.studentId,
          rewardId: definition.rewards[0]!.id,
        };
        const achievement = await tx.achievement.findUnique({
          where: { studentId_rewardId: reward },
        });
        await tx.achievement.upsert({
          where: { studentId_rewardId: reward },
          create: { ...reward, stars: summary.stars },
          update: { stars: Math.max(achievement?.stars ?? 0, summary.stars) },
        });
      }
      return saved;
    });
    if (!result) {
      res.status(404).json({ error: 'Không tìm thấy lượt luyện.' });
      return;
    }
    res.json({
      id: result.id,
      attemptId: result.attemptId,
      score: result.score,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
      correctActions: result.correctActions,
      wrongActions: result.wrongActions,
      completedTargets: result.completedTargets,
      stars: result.stars,
      passed: result.passed,
      cpm: result.cpm,
      wpm: result.wpm,
      longestStreak: result.longestStreak,
      errorCount: result.errorCount,
    });
  });
  return router;
}
