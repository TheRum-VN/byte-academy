import { Router } from 'express';
import { z } from 'zod';
import {
  createSimulation,
  applySimulation,
  simulationDefinition,
  simulationGoals,
  simulationSummary,
  simulationLessons,
  type SimulationState,
} from '@byte/shared';
import { db } from '../database/client.js';
import { studentIdentity } from '../services/student.js';
import { newToken, hashToken } from '../services/auth.js';
import { cookieOptions } from '../middleware/security.js';
import { simulationCommandSchema } from '../validation/simulation.js';
type Control = { at: number; state: string };
function duration(first: number, last: number, controls: Control[][]) {
  const stateAt = (log: Control[], at: number) =>
    log.filter((c) => c.at <= at).at(-1)?.state;
  const boundaries = [
    ...new Set([first, last, ...controls.flat().map((c) => c.at)]),
  ]
    .filter((t) => t >= first && t <= last)
    .sort((a, b) => a - b);
  let paused = 0;
  for (let i = 0; i < boundaries.length - 1; i++)
    if (
      controls.some((log) =>
        ['PAUSED', 'FINISHED', 'RESULT', 'LEADERBOARD'].includes(
          stateAt(log, boundaries[i]!) ?? '',
        ),
      )
    )
      paused += boundaries[i + 1]! - boundaries[i]!;
  return Math.max(0, last - first - paused);
}
const ticket = (a: {
  id: string;
  simulationState: string;
  simulationRevision: number;
  state: string;
  sessionId: string | null;
}) => {
  const state = JSON.parse(a.simulationState) as SimulationState;
  return {
    id: a.id,
    revision: a.simulationRevision,
    paused: a.state === 'PAUSED',
    roomSessionId: a.sessionId,
    state,
    goals: simulationGoals(state),
  };
};
export function simulationRoutes() {
  const router = Router();
  router.get('/simulation/attempts/:id', async (req, res) => {
    const identity = await studentIdentity(req),
      attempt = await db.attempt.findFirst({
        where: {
          id: String(req.params.id),
          studentId: identity?.studentId ?? '',
        },
      });
    if (!attempt || !simulationLessons.some((l) => l.id === attempt.lessonId)) {
      res.status(404).json({ error: 'Không tìm thấy lượt thực hành.' });
      return;
    }
    res.json(ticket(attempt));
  });
  router.post('/simulation/attempts', async (req, res) => {
    const body = z.object({ lessonId: z.string() }).parse(req.body),
      definition = simulationLessons.find((l) => l.id === body.lessonId),
      stored = await db.lesson.findUnique({ where: { id: body.lessonId } });
    if (!definition || !stored?.available) {
      res.status(409).json({ error: 'Bài học chưa mở.' });
      return;
    }
    let identity = await studentIdentity(req);
    let sessionId: string | null = null;
    let endedSessionId: string | null = null;
    let roomState = 'PLAYING';
    if (identity?.roomId) {
      const session = await db.roomSession.findFirstOrThrow({
        where: { roomId: identity.roomId },
        orderBy: { createdAt: 'desc' },
      });
      if (!['FINISHED', 'RESULT', 'LEADERBOARD'].includes(session.state)) {
        if (session.lessonId !== definition.id) {
          res.status(409).json({
            error: 'Phòng học đang học bài khác. Hãy mở đúng bài thầy cô chọn.',
          });
          return;
        }
        sessionId = session.id;
        roomState = session.state;
      } else if (session.lessonId === definition.id)
        endedSessionId = session.id;
    }
    if (!identity) {
      const token = newToken(),
        practice = await db.practiceIdentity.create({
          data: {
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + cookieOptions.maxAge),
            student: { create: { name: 'Tự luyện tập' } },
          },
        });
      identity = { studentId: practice.studentId, roomId: null };
      res.cookie('byte_practice', token, cookieOptions);
    }
    const existing = await db.attempt.findFirst({
      where: {
        studentId: identity.studentId,
        lessonId: definition.id,
        sessionId,
        state: { in: ['PLAYING', 'PAUSED'] },
        result: null,
      },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) {
      res.json(ticket(existing));
      return;
    }
    if (endedSessionId) {
      const unfinished = await db.attempt.findFirst({
        where: {
          studentId: identity.studentId,
          lessonId: definition.id,
          sessionId: endedSessionId,
          state: { in: ['PLAYING', 'PAUSED'] },
          result: null,
        },
        orderBy: { startedAt: 'desc' },
      });
      if (unfinished) {
        res.json(ticket(unfinished));
        return;
      }
    }
    if (roomState !== 'PLAYING') {
      res
        .status(409)
        .json({ error: 'Phòng học chưa bắt đầu. Hãy chờ thầy cô.' });
      return;
    }
    const attempt = await db.attempt.create({
      data: {
        studentId: identity.studentId,
        lessonId: definition.id,
        sessionId,
        skillId: definition.skill,
        levelId: '1',
        state: 'PLAYING',
        simulationState: JSON.stringify(
          createSimulation(
            simulationDefinition(definition),
            new Date().toISOString(),
          ),
        ),
      },
    });
    res.status(201).json(ticket(attempt));
  });
  router.post('/simulation/attempts/:id/action', async (req, res) => {
    const body = z
        .object({
          revision: z.number().int().min(0),
          action: simulationCommandSchema,
        })
        .parse(req.body),
      identity = await studentIdentity(req);
    const result = await db.$transaction(async (tx) => {
      const a = await tx.attempt.findFirst({
        where: {
          id: String(req.params.id),
          studentId: identity?.studentId ?? '',
        },
        include: { session: true, result: true },
      });
      if (!a || !simulationLessons.some((l) => l.id === a.lessonId))
        return null;
      if (
        a.result ||
        a.state !== 'PLAYING' ||
        (a.session && a.session.state !== 'PLAYING')
      )
        throw new Error('Bài học đang tạm dừng hoặc đã kết thúc.');
      if (a.simulationRevision !== body.revision)
        throw new Error(
          'Bài học đã thay đổi. Hãy tải trạng thái đã lưu trước khi thao tác tiếp.',
        );
      let next: SimulationState;
      try {
        next = applySimulation(
          JSON.parse(a.simulationState) as SimulationState,
          body.action,
          new Date().toISOString(),
        );
      } catch (error) {
        throw new Error(
          `Bài học: ${error instanceof Error ? error.message : 'Thao tác chưa hợp lệ.'}`,
        );
      }
      const changed = await tx.attempt.updateMany({
        where: {
          id: a.id,
          simulationRevision: body.revision,
          state: 'PLAYING',
        },
        data: {
          simulationState: JSON.stringify(next),
          simulationRevision: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new Error('Bài học đã thay đổi. Hãy tải trạng thái đã lưu.');
      return ticket({
        ...a,
        simulationState: JSON.stringify(next),
        simulationRevision: a.simulationRevision + 1,
      });
    });
    if (!result) {
      res.status(404).json({ error: 'Không tìm thấy lượt thực hành.' });
      return;
    }
    res.json(result);
  });
  router.post('/simulation/attempts/:id/result', async (req, res) => {
    const body = z
        .object({ revision: z.number().int().min(0) })
        .parse(req.body),
      identity = await studentIdentity(req);
    const result = await db.$transaction(async (tx) => {
      const a = await tx.attempt.findFirst({
        where: {
          id: String(req.params.id),
          studentId: identity?.studentId ?? '',
        },
        include: { result: true, session: true },
      });
      if (!a || !simulationLessons.some((l) => l.id === a.lessonId))
        return null;
      if (a.result) return a.result;
      if (a.simulationRevision !== body.revision)
        throw new Error(
          'Bài học đã thay đổi. Hãy tải trạng thái đã lưu trước khi nộp.',
        );
      const state = JSON.parse(a.simulationState) as SimulationState,
        now = Date.now();
      const summary = simulationSummary(
        state,
        duration(
          state.firstActionAt ? Date.parse(state.firstActionAt) : now,
          now,
          [
            JSON.parse(a.pauseLog) as Control[],
            a.session ? (JSON.parse(a.session.controlLog) as Control[]) : [],
          ],
        ),
      );
      const saved = await tx.result.create({
        data: { attemptId: a.id, ...summary, inputLog: a.simulationState },
      });
      await tx.attempt.update({
        where: { id: a.id },
        data: { state: 'RESULT' },
      });
      if (summary.passed) {
        const progressKey = { studentId: a.studentId, lessonId: a.lessonId },
          old = await tx.progress.findUnique({
            where: { studentId_lessonId: progressKey },
          });
        await tx.progress.upsert({
          where: { studentId_lessonId: progressKey },
          create: {
            ...progressKey,
            completedCount: 1,
            bestScore: summary.score,
          },
          update: {
            completedCount: { increment: 1 },
            bestScore: Math.max(old?.bestScore ?? 0, summary.score),
          },
        });
        const rewardKey = {
            studentId: a.studentId,
            rewardId: simulationLessons.find((l) => l.id === a.lessonId)!
              .rewards[0]!.id,
          },
          reward = await tx.achievement.findUnique({
            where: { studentId_rewardId: rewardKey },
          });
        await tx.achievement.upsert({
          where: { studentId_rewardId: rewardKey },
          create: { ...rewardKey, stars: summary.stars },
          update: { stars: Math.max(reward?.stars ?? 0, summary.stars) },
        });
      }
      return saved;
    });
    if (!result) {
      res.status(404).json({ error: 'Không tìm thấy lượt thực hành.' });
      return;
    }
    res.json({
      id: result.id,
      score: result.score,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
      correctActions: result.correctActions,
      wrongActions: result.wrongActions,
      completedTargets: result.completedTargets,
      stars: result.stars,
      passed: result.passed,
    });
  });
  return router;
}
