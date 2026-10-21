import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { createApp } from '../../apps/server/src/app.js';
import { db } from '../../apps/server/src/database/client.js';
import { mouseLessons, mouseConfig, MouseRun } from '@byte/shared';
import { completeRun } from '../helpers/mouse';
const app = createApp();
const student = request.agent(app);
const teacher = request.agent(app);
const foreign = request.agent(app);
let code = '';
let attemptId = '';
beforeAll(async () => {
  for (const lesson of mouseLessons)
    await db.lesson.create({
      data: {
        id: lesson.id,
        module: 'mouse',
        title: lesson.title,
        definition: JSON.stringify(lesson),
        available: true,
      },
    });
  await db.teacher.create({
    data: {
      username: 'mouse-teacher',
      name: 'Mouse QA',
      passwordHash: await hash('test-only-passphrase', 4),
    },
  });
  await teacher
    .post('/api/auth/login')
    .send({ username: 'mouse-teacher', password: 'test-only-passphrase' });
});
afterAll(() => db.$disconnect());
describe('verified mouse results, ownership and rooms', () => {
  it('creates a private practice identity and refuses unavailable lessons or unsupported settings', async () => {
    expect(
      (await student.post('/api/attempts').send({ lessonId: 'mouse-intro' }))
        .status,
    ).toBe(409);
    expect(
      (
        await student
          .post('/api/attempts')
          .send({ lessonId: 'mouse-double-1', doubleClickMs: 2000 })
      ).status,
    ).toBe(400);
    const response = await student
      .post('/api/attempts')
      .send({ lessonId: 'mouse-left-1' });
    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    attemptId = response.body.id;
    expect(
      (
        await foreign
          .post(`/api/attempts/${attemptId}/result`)
          .send({ events: [] })
      ).status,
    ).toBe(404);
  });
  it('replays inputs and saves one atomic result/progress/reward, idempotently', async () => {
    const attempt = await db.attempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    await db.attempt.update({
      where: { id: attemptId },
      data: { startedAt: new Date(Date.now() - 10000) },
    });
    const run = new MouseRun(mouseConfig(mouseLessons[0]!), attempt.seed);
    const events = completeRun(run);
    const result = await student
      .post(`/api/attempts/${attemptId}/result`)
      .send({ events, score: 999999 });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      score: 100,
      stars: 3,
      passed: true,
      completedTargets: 3,
      correctActions: 3,
      wrongActions: 0,
    });
    expect(result.body.inputLog).toBeUndefined();
    const duplicate = await student
      .post(`/api/attempts/${attemptId}/result`)
      .send({ events: [] });
    expect(duplicate.body.id).toBe(result.body.id);
    expect(await db.result.count({ where: { attemptId } })).toBe(1);
    expect(
      await db.progress.findFirst({ where: { studentId: attempt.studentId } }),
    ).toMatchObject({ completedCount: 1, bestScore: 100 });
    const overview = await student.get('/api/student/overview');
    expect(overview.body.progress[0].bestScore).toBe(100);
    expect(overview.body.achievements[0].stars).toBe(3);
  });
  it('rejects impossible timestamps and pauses; an incomplete log is saved as not passed', async () => {
    const response = await student
      .post('/api/attempts')
      .send({ lessonId: 'mouse-drag-1' });
    const id = response.body.id;
    const event = { type: 'down', button: 0, x: 115, y: 170, t: 90000 };
    expect(
      (
        await student
          .post(`/api/attempts/${id}/result`)
          .send({ events: [event] })
      ).status,
    ).toBe(409);
    expect(
      (await student.post(`/api/attempts/${id}/pause`).send({ paused: true }))
        .status,
    ).toBe(200);
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id } });
    const pause = JSON.parse(attempt.pauseLog)[0].at as number;
    expect(
      (
        await student.post(`/api/attempts/${id}/result`).send({
          events: [{ ...event, t: pause - attempt.startedAt.getTime() + 1 }],
        })
      ).status,
    ).toBe(409);
    await student.post(`/api/attempts/${id}/pause`).send({ paused: false });
    const result = await student
      .post(`/api/attempts/${id}/result`)
      .send({
        events: [
          {
            type: 'cancel',
            button: -1,
            x: 0,
            y: 0,
            t: pause - attempt.startedAt.getTime() + 1,
          },
        ],
      });
    expect(result.body).toMatchObject({
      passed: false,
      score: 0,
      stars: 0,
      completedTargets: 0,
    });
  });
  it('requires matching active room lesson and PLAYING, rejects stale revisions and inputs during teacher pause', async () => {
    const room = await teacher
      .post('/api/rooms')
      .send({ name: 'Mouse room', lessonId: 'mouse-double-1' });
    code = room.body.code;
    await student
      .post('/api/rooms/join')
      .send({ code, name: 'Bạn luyện chuột' });
    expect(
      (await student.post('/api/attempts').send({ lessonId: 'mouse-double-1' }))
        .status,
    ).toBe(409);
    for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
      expect(
        (
          await teacher
            .post(`/api/rooms/${code}/state`)
            .send({ state, revision })
        ).status,
      ).toBe(200);
    expect(
      (await student.post('/api/attempts').send({ lessonId: 'mouse-left-1' }))
        .status,
    ).toBe(409);
    const response = await student
      .post('/api/attempts')
      .send({ lessonId: 'mouse-double-1' });
    expect(response.status).toBe(201);
    const id = response.body.id;
    await teacher
      .post(`/api/rooms/${code}/state`)
      .send({ state: 'PAUSED', revision: 3 });
    expect(
      (
        await teacher
          .post(`/api/rooms/${code}/state`)
          .send({ state: 'PLAYING', revision: 3 })
      ).status,
    ).toBe(409);
    const attempt = await db.attempt.findUniqueOrThrow({
      where: { id },
      include: { session: true },
    });
    const pause = JSON.parse(attempt.session!.controlLog).at(-1).at as number;
    expect(
      (
        await student.post(`/api/attempts/${id}/result`).send({
          events: [
            {
              type: 'down',
              button: 0,
              x: 200,
              y: 175,
              t: pause - attempt.startedAt.getTime() + 1,
            },
          ],
        })
      ).status,
    ).toBe(409);
    await teacher
      .post(`/api/rooms/${code}/state`)
      .send({ state: 'PLAYING', revision: 4 });
    await db.attempt.update({
      where: { id },
      data: { startedAt: new Date(Date.now() - 20000) },
    });
    const run = new MouseRun(
      mouseConfig(mouseLessons.find((l) => l.id === 'mouse-double-1')!),
      response.body.seed,
    );
    const result = await student
      .post(`/api/attempts/${id}/result`)
      .send({ events: completeRun(run) });
    expect(result.status).toBe(200);
    expect(result.body.passed).toBe(true);
    expect(
      (await teacher.get('/api/reports')).body.some(
        (r: { attemptId: string }) => r.attemptId === id,
      ),
    ).toBe(true);
    expect((await foreign.get('/api/reports')).status).toBe(401);
  });
});
