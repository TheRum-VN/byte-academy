import { Router } from 'express';
import { gameRoutes } from './games.js';
import { typingRoutes } from './typing.js';
import { simulationRoutes } from './simulation.js';
import { studentIdentity } from '../services/student.js';
import { compare } from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db } from '../database/client.js';
import { requireTeacher, cookieOptions } from '../middleware/security.js';
import { hashToken, newToken, membership } from '../services/auth.js';
import { roomCode, snapshot, changeState } from '../services/rooms.js';
import {
  loginSchema,
  classroomSchema,
  studentSchema,
  roomSchema,
  joinSchema,
  stateSchema,
} from '../validation/schemas.js';
import type { RoomSnapshot, StudentOverview } from '@byte/shared';
export function api(broadcast: (room: RoomSnapshot) => void) {
  const router = Router();
  router.use(gameRoutes());
  router.use(typingRoutes());
  router.use(simulationRoutes());
  router.get('/health', async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  });
  router.post(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    async (req, res) => {
      const body = loginSchema.parse(req.body);
      const teacher = await db.teacher.findUnique({
        where: { username: body.username },
      });
      if (!teacher || !(await compare(body.password, teacher.passwordHash))) {
        res
          .status(401)
          .json({ error: 'Tên đăng nhập hoặc mật khẩu chưa đúng.' });
        return;
      }
      const token = newToken();
      await db.authSession.create({
        data: {
          teacherId: teacher.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + cookieOptions.maxAge),
        },
      });
      res
        .cookie('byte_teacher', token, cookieOptions)
        .json({ id: teacher.id, name: teacher.name });
    },
  );
  router.post('/auth/logout', async (req, res) => {
    if (req.cookies.byte_teacher)
      await db.authSession.deleteMany({
        where: { tokenHash: hashToken(req.cookies.byte_teacher) },
      });
    res.clearCookie('byte_teacher', cookieOptions).sendStatus(204);
  });
  router.get('/auth/me', requireTeacher, (_req, res) =>
    res.json({ id: res.locals.teacher.id, name: res.locals.teacher.name }),
  );
  router.get('/lessons', async (_req, res) =>
    res.json(
      (await db.lesson.findMany())
        .map((l) => ({
          ...JSON.parse(l.definition),
          available: l.available,
        }))
        .filter((l) => !l.config.retired),
    ),
  );
  router.get('/student/overview', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const member =
      typeof req.cookies.byte_student === 'string'
        ? await db.roomMember.findFirst({
            where: {
              tokenHash: hashToken(req.cookies.byte_student),
              expiresAt: { gt: new Date() },
            },
            include: {
              student: {
                include: {
                  classroom: true,
                  progress: true,
                  achievements: true,
                },
              },
            },
          })
        : null;
    const overview: StudentOverview = {
      student: null,
      classroom: null,
      room: null,
      progress: [],
      achievements: [],
      activeLessonIds: [],
      todayCompletedLessonIds: [],
    };
    const identity = await studentIdentity(req);
    const currentStudent =
      member?.student ??
      (identity
        ? await db.student.findUnique({
            where: { id: identity.studentId },
            include: { classroom: true, progress: true, achievements: true },
          })
        : null);
    if (currentStudent) {
      const student = currentStudent;
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const dayStart = new Date(`${day}T00:00:00+07:00`);
      const attempts = await db.attempt.findMany({
        where: {
          studentId: student.id,
          OR: [
            {
              state: {
                in: ['INSTRUCTIONS', 'READY', 'COUNTDOWN', 'PLAYING', 'PAUSED'],
              },
            },
            {
              state: { in: ['COMPLETED', 'RESULT'] },
              result: {
                passed: true,
                createdAt: {
                  gte: dayStart,
                  lt: new Date(dayStart.getTime() + 86400000),
                },
              },
            },
          ],
        },
        select: {
          lessonId: true,
          state: true,
          result: { select: { id: true, passed: true } },
        },
      });
      overview.student = { id: student.id, name: student.name };
      overview.classroom = student.classroom
        ? { name: student.classroom.name, grade: student.classroom.grade }
        : null;
      overview.room = member ? await snapshot(member.roomId) : null;
      overview.progress = student.progress.map(
        ({ lessonId, completedCount, bestScore }) => ({
          lessonId,
          completedCount,
          bestScore,
        }),
      );
      overview.achievements = student.achievements.map(
        ({ rewardId, stars }) => ({ rewardId, stars }),
      );
      overview.activeLessonIds = [
        ...new Set(attempts.filter((a) => !a.result).map((a) => a.lessonId)),
      ];
      overview.todayCompletedLessonIds = [
        ...new Set(
          attempts.filter((a) => a.result?.passed).map((a) => a.lessonId),
        ),
      ];
    }
    res.json(overview);
  });
  router.get('/classes', requireTeacher, async (_req, res) =>
    res.json(
      await db.classroom.findMany({
        where: { teacherId: res.locals.teacher.id },
        include: { students: true },
      }),
    ),
  );
  router.post('/classes', requireTeacher, async (req, res) =>
    res.status(201).json(
      await db.classroom.create({
        data: {
          ...classroomSchema.parse(req.body),
          teacherId: res.locals.teacher.id,
        },
      }),
    ),
  );
  router.post('/classes/:id/students', requireTeacher, async (req, res) => {
    const classroom = await db.classroom.findFirst({
      where: { id: String(req.params.id), teacherId: res.locals.teacher.id },
    });
    if (!classroom) {
      res.status(404).json({ error: 'Không tìm thấy lớp.' });
      return;
    }
    res.status(201).json(
      await db.student.create({
        data: { ...studentSchema.parse(req.body), classroomId: classroom.id },
      }),
    );
  });
  router.get('/rooms', requireTeacher, async (_req, res) => {
    const rooms = await db.room.findMany({
      where: { teacherId: res.locals.teacher.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(await Promise.all(rooms.map((r) => snapshot(r.id))));
  });
  router.post('/rooms', requireTeacher, async (req, res) => {
    const body = roomSchema.parse(req.body);
    if (!(await db.lesson.findUnique({ where: { id: body.lessonId } }))) {
      res.status(404).json({ error: 'Bài học không tồn tại.' });
      return;
    }
    if (
      body.classroomId &&
      !(await db.classroom.findFirst({
        where: { id: body.classroomId, teacherId: res.locals.teacher.id },
      }))
    ) {
      res.status(403).json({ error: 'Lớp học không thuộc giáo viên.' });
      return;
    }
    // Database uniqueness protects against code collisions; retry only that constraint.
    for (let i = 0; i < 5; i++) {
      try {
        const room = await db.room.create({
          data: {
            code: roomCode(),
            name: body.name,
            teacherId: res.locals.teacher.id,
            classroomId: body.classroomId,
            sessions: { create: { lessonId: body.lessonId } },
          },
        });
        res.status(201).json(await snapshot(room.id));
        return;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !('code' in error) ||
          error.code !== 'P2002'
        )
          throw error;
      }
    }
    res.status(503).json({ error: 'Chưa tạo được mã phòng. Hãy thử lại.' });
  });
  router.post(
    '/rooms/join',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    async (req, res) => {
      const body = joinSchema.parse(req.body);
      const room = await db.room.findUnique({ where: { code: body.code } });
      if (!room) {
        res.status(404).json({ error: 'Không tìm thấy mã phòng.' });
        return;
      }
      const token = newToken();
      const member = await db.$transaction(async (tx) => {
        const session = await tx.roomSession.findFirstOrThrow({
          where: { roomId: room.id },
          orderBy: { createdAt: 'desc' },
        });
        if (!['LOBBY', 'READY'].includes(session.state))
          throw new Error('Phòng không còn nhận học sinh.');
        const existing = await membership(req.cookies.byte_student, room.id);
        if (existing)
          return tx.roomMember.update({
            where: { id: existing.id },
            data: {
              tokenHash: hashToken(token),
              expiresAt: new Date(Date.now() + cookieOptions.maxAge),
            },
            include: { student: true },
          });
        const count = await tx.roomMember.count({ where: { roomId: room.id } });
        if (count >= 60) throw new Error('Phòng đã đủ 60 học sinh.');
        return tx.roomMember.create({
          data: {
            room: { connect: { id: room.id } },
            student: {
              create: { name: body.name, classroomId: room.classroomId },
            },
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + cookieOptions.maxAge),
          },
          include: { student: true },
        });
      });
      const state = await snapshot(room.id);
      broadcast(state);
      res
        .cookie('byte_student', token, cookieOptions)
        .status(201)
        .json({
          room: state,
          student: { id: member.student.id, name: member.student.name },
        });
    },
  );
  router.get('/rooms/:code', async (req, res) => {
    const room = await db.room.findUnique({
      where: { code: String(req.params.code) },
    });
    if (!room) {
      res.status(404).json({ error: 'Không tìm thấy phòng.' });
      return;
    }
    const { getTeacher } = await import('../services/auth.js');
    const teacher = await getTeacher(req.cookies.byte_teacher);
    if (
      teacher?.id !== room.teacherId &&
      !(await membership(req.cookies.byte_student, room.id))
    ) {
      res.status(403).json({ error: 'Bạn chưa tham gia phòng.' });
      return;
    }
    res.json(await snapshot(room.id));
  });
  router.post('/rooms/:code/state', requireTeacher, async (req, res) => {
    const room = await db.room.findFirst({
      where: {
        code: String(req.params.code),
        teacherId: res.locals.teacher.id,
      },
    });
    if (!room) {
      res.status(404).json({ error: 'Không tìm thấy phòng của bạn.' });
      return;
    }
    const body = stateSchema.parse(req.body);
    await changeState(room.id, body.state, body.revision);
    const state = await snapshot(room.id);
    broadcast(state);
    res.json(state);
  });
  router.get('/reports', requireTeacher, async (_req, res) => {
    const results = await db.result.findMany({
      where: {
        attempt: {
          OR: [
            { session: { room: { teacherId: res.locals.teacher.id } } },
            { student: { classroom: { teacherId: res.locals.teacher.id } } },
          ],
        },
      },
      select: {
        id: true,
        attemptId: true,
        score: true,
        accuracy: true,
        durationMs: true,
        completedTargets: true,
        correctActions: true,
        wrongActions: true,
        cpm: true,
        wpm: true,
        longestStreak: true,
        errorCount: true,
        stars: true,
        passed: true,
        createdAt: true,
        attempt: {
          select: {
            lessonId: true,
            skillId: true,
            levelId: true,
            startedAt: true,
            student: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(results);
  });
  return router;
}
