import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { createApp } from '../../apps/server/src/app.js';
import { db } from '../../apps/server/src/database/client.js';
import { lessons } from '@byte/shared';
const app = createApp();
const teacher = request.agent(app);
const other = request.agent(app);
const student = request.agent(app);
let code = '';
let classId = '';
beforeAll(async () => {
  await db.teacher.create({
    data: {
      username: 'teacher-test',
      name: 'Test Teacher',
      passwordHash: await hash('test-only-passphrase', 4),
    },
  });
  await db.teacher.create({
    data: {
      username: 'other-teacher',
      name: 'Other',
      passwordHash: await hash('test-only-passphrase', 4),
    },
  });
  for (const l of lessons)
    await db.lesson.create({
      data: {
        id: l.id,
        module: l.module,
        title: l.title,
        definition: JSON.stringify(l),
        available: l.available,
      },
    });
});
afterAll(() => db.$disconnect());
describe('real SQLite API', () => {
  it('reports health from database and rejects anonymous management', async () => {
    expect((await request(app).get('/api/health')).body.database).toBe(
      'connected',
    );
    expect((await request(app).get('/api/classes')).status).toBe(401);
  });
  it('rejects invalid credentials, inputs and foreign origins', async () => {
    expect(
      (
        await teacher
          .post('/api/auth/login')
          .send({ username: 'teacher-test', password: 'bad' })
      ).status,
    ).toBe(401);
    expect(
      (
        await teacher
          .post('/api/auth/login')
          .set('Origin', 'https://untrusted.example')
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/rooms/join')
          .send({ code: 'bad', name: '' })
      ).status,
    ).toBe(400);
  });
  it('logs in using a hashed credential and HttpOnly cookie', async () => {
    const res = await teacher
      .post('/api/auth/login')
      .send({ username: 'teacher-test', password: 'test-only-passphrase' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
    await other
      .post('/api/auth/login')
      .send({ username: 'other-teacher', password: 'test-only-passphrase' });
    const row = await db.teacher.findUniqueOrThrow({
      where: { username: 'teacher-test' },
    });
    expect(row.passwordHash).not.toBe('test-only-passphrase');
  });
  it('persists classes and students while enforcing teacher ownership', async () => {
    const res = await teacher
      .post('/api/classes')
      .send({ name: 'Lớp 3A', grade: 3 });
    expect(res.status).toBe(201);
    classId = res.body.id;
    expect(
      (
        await teacher
          .post(`/api/classes/${classId}/students`)
          .send({ name: 'An' })
      ).status,
    ).toBe(201);
    expect(
      (
        await other
          .post(`/api/classes/${classId}/students`)
          .send({ name: 'Không được phép' })
      ).status,
    ).toBe(404);
    expect((await other.get('/api/classes')).body).toEqual([]);
  });
  it('creates and joins a persisted room without exposing its student roster', async () => {
    const res = await teacher.post('/api/rooms').send({
      name: 'Phòng Tin học',
      lessonId: 'mouse-intro',
      classroomId: classId,
    });
    expect(res.status).toBe(201);
    code = res.body.code;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect((await request(app).get(`/api/rooms/${code}`)).status).toBe(403);
    const joined = await student
      .post('/api/rooms/join')
      .send({ name: 'Bình', code });
    expect(joined.status).toBe(201);
    expect(joined.body.room.memberCount).toBe(1);
    expect(joined.body.participantToken).toBeUndefined();
    expect((await student.get(`/api/rooms/${code}`)).status).toBe(200);
    expect((await other.get(`/api/rooms/${code}`)).status).toBe(403);
  });
  it('blocks starting unavailable gameplay and invalid room transitions', async () => {
    expect(
      (
        await teacher
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'READY', revision: 0 })
      ).status,
    ).toBe(409);
    expect(
      (
        await teacher
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'PLAYING', revision: 0 })
      ).status,
    ).toBe(409);
    expect(
      (
        await other
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'FINISHED', revision: 0 })
      ).status,
    ).toBe(404);
  });
  it('scopes student summaries to the cookie and reads persisted progress/rewards', async () => {
    const empty = await request(app).get('/api/student/overview');
    expect(empty.body).toMatchObject({
      student: null,
      progress: [],
      achievements: [],
    });
    const current = await student.get('/api/student/overview');
    expect(current.body.student.name).toBe('Bình');
    expect(current.body.classroom).toEqual({ name: 'Lớp 3A', grade: 3 });
    const studentId = current.body.student.id as string;
    await db.progress.create({
      data: {
        studentId,
        lessonId: 'mouse-intro',
        bestScore: 80,
        completedCount: 1,
      },
    });
    await db.achievement.create({
      data: { studentId, rewardId: 'mouse-first', stars: 1 },
    });
    await db.attempt.create({
      data: {
        studentId,
        lessonId: 'mouse-intro',
        state: 'RESULT',
        result: {
          create: {
            score: 80,
            passed: true,
            accuracy: 0.8,
            durationMs: 5000,
            completedTargets: 4,
          },
        },
      },
    });
    const read = await student.get('/api/student/overview');
    expect(read.body.progress).toEqual([
      { lessonId: 'mouse-intro', bestScore: 80, completedCount: 1 },
    ]);
    expect(read.body.achievements).toEqual([
      { rewardId: 'mouse-first', stars: 1 },
    ]);
    expect(read.body.todayCompletedLessonIds).toEqual(['mouse-intro']);
    await db.attempt.create({
      data: {
        studentId,
        lessonId: 'keyboard-intro',
        state: 'RESULT',
        result: {
          create: {
            score: 100,
            passed: true,
            accuracy: 1,
            durationMs: 5000,
            completedTargets: 5,
            createdAt: new Date(Date.now() - 86400000),
          },
        },
      },
    });
    expect(
      (await student.get('/api/student/overview')).body.todayCompletedLessonIds,
    ).toEqual(['mouse-intro']);
    expect((await other.get('/api/student/overview')).body.student).toBeNull();
    expect(
      (await request(app).get(`/api/student/overview?studentId=${studentId}`))
        .body.progress,
    ).toEqual([]);
    await db.roomMember.updateMany({
      where: { studentId },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (await student.get('/api/student/overview')).body.student,
    ).toBeNull();
    await db.roomMember.updateMany({
      where: { studentId },
      data: { expiresAt: new Date(Date.now() + 3600000) },
    });
    await db.result.deleteMany({ where: { attempt: { studentId } } });
    await db.attempt.deleteMany({ where: { studentId } });
    await db.progress.deleteMany({ where: { studentId } });
    await db.achievement.deleteMany({ where: { studentId } });
  });
  it('finishes a room atomically and rejects late joins', async () => {
    expect(
      (
        await teacher
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'FINISHED', revision: 0 })
      ).status,
    ).toBe(200);
    expect(
      (
        await teacher
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'RESULT', revision: 0 })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/rooms/join')
          .send({ name: 'Late student', code })
      ).status,
    ).toBe(409);
  });
  it('does not invent results and revokes teacher sessions on logout', async () => {
    expect((await teacher.get('/api/reports')).body).toEqual([]);
    expect((await teacher.post('/api/auth/logout')).status).toBe(204);
    expect((await teacher.get('/api/auth/me')).status).toBe(401);
  });
});
