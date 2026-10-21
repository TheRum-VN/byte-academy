import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import {
  typingLessons,
  typingConfig,
  physicalTargets,
  type TypingEvent,
} from '@byte/shared';
import { createApp } from '../../apps/server/src/app.js';
import { db } from '../../apps/server/src/database/client.js';
const app = createApp(),
  student = request.agent(app),
  foreign = request.agent(app),
  teacher = request.agent(app);
beforeAll(async () => {
  for (const l of typingLessons)
    await db.lesson.create({
      data: {
        id: l.id,
        module: l.module,
        title: l.title,
        definition: JSON.stringify(l),
        available: true,
      },
    });
  await db.teacher.create({
    data: {
      username: 'typing-teacher',
      name: 'Typing QA',
      passwordHash: await hash('typing-only-passphrase', 4),
    },
  });
  await teacher
    .post('/api/auth/login')
    .send({ username: 'typing-teacher', password: 'typing-only-passphrase' });
});
afterAll(() => db.$disconnect());
async function begin(id: string, agent = student) {
  const r = await agent
    .post('/api/typing/attempts')
    .send({
      lessonId: id,
      ...(id === 'vietnamese-name' ? { name: 'Nguyễn An' } : {}),
    });
  expect(r.status).toBe(201);
  await db.attempt.update({
    where: { id: r.body.id },
    data: { startedAt: new Date(Date.now() - 10000) },
  });
  return r.body.id as string;
}
function events(id: string): TypingEvent[] {
  const l = typingLessons.find((l) => l.id === id)!,
    config = typingConfig(l);
  if (config.kind === 'text')
    return [
      {
        type: 'text',
        t: 1000,
        value: id === 'vietnamese-name' ? 'Nguyễn An' : config.target,
      },
      { type: 'finish', t: 2000 },
    ];
  return physicalTargets(config).flatMap((code, i) => [
    { type: 'down' as const, t: 1000 + i * 40, code, key: code },
    { type: 'up' as const, t: 1020 + i * 40, code },
  ]);
}
it('completes every character-based keyboard and all 11 Vietnamese lessons, saves server metrics and rewards', async () => {
  for (const l of typingLessons.filter((l) => !typingConfig(l).seconds)) {
    const id = await begin(l.id);
    const r = await student
      .post(`/api/typing/attempts/${id}/result`)
      .send({ events: events(l.id), score: 0, wpm: 99999 });
    expect(r.status, l.id).toBe(200);
    expect(r.body, l.id).toMatchObject({
      passed: true,
      score: 100,
      accuracy: 1,
      stars: 3,
      errorCount: 0,
    });
    expect(r.body.wpm).not.toBe(99999);
    expect(r.body.inputLog).toBeUndefined();
    const duplicate = await student
      .post(`/api/typing/attempts/${id}/result`)
      .send({ events: [] });
    expect(duplicate.body.id).toBe(r.body.id);
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id } });
    expect(
      await db.progress.findUnique({
        where: {
          studentId_lessonId: { studentId: attempt.studentId, lessonId: l.id },
        },
      }),
    ).toMatchObject({ completedCount: 1 });
  }
  expect(
    (await student.get('/api/student/overview')).body.progress,
  ).toHaveLength(26);
});
it('protects ownership, unavailable lessons, invalid names, timestamps and unsolved results', async () => {
  expect(
    (
      await student
        .post('/api/typing/attempts')
        .send({ lessonId: 'files-intro' })
    ).status,
  ).toBe(409);
  expect(
    (
      await student
        .post('/api/typing/attempts')
        .send({ lessonId: 'vietnamese-name', name: '<bad>' })
    ).status,
  ).toBe(400);
  const id = await begin('keyboard-letters');
  expect(
    (
      await foreign
        .post(`/api/typing/attempts/${id}/result`)
        .send({ events: [] })
    ).status,
  ).toBe(404);
  expect(
    (await foreign.post(`/api/attempts/${id}/pause`).send({ paused: true }))
      .status,
  ).toBe(404);
  expect(
    (
      await student
        .post(`/api/typing/attempts/${id}/result`)
        .send({ events: [{ type: 'text', t: 90000, value: 'afjk' }] })
    ).status,
  ).toBe(409);
  expect(
    (
      await student.post(`/api/typing/attempts/${id}/result`).send({
        events: [
          { type: 'down', t: 20, code: 'KeyA' },
          { type: 'up', t: 10, code: 'KeyA' },
        ],
      })
    ).status,
  ).toBe(409);
  const r = await student
    .post(`/api/typing/attempts/${id}/result`)
    .send({ events: [{ type: 'text', t: 1000, value: 'afjk' }] });
  expect(r.body).toMatchObject({
    passed: false,
    stars: 0,
    completedTargets: 0,
  });
});
it('excludes idle and pause time, ignores repeat and supports text correction/mode changes', async () => {
  const id = await begin('vietnamese-sentence');
  const stored = await db.attempt.findUniqueOrThrow({ where: { id } });
  const at = stored.startedAt.getTime();
  await db.attempt.update({
    where: { id },
    data: {
      pauseLog: JSON.stringify([
        { at: at + 3000, state: 'PAUSED' },
        { at: at + 5000, state: 'PLAYING' },
      ]),
    },
  });
  const r = await student.post(`/api/typing/attempts/${id}/result`).send({
    events: [
      { type: 'mode', t: 500, mode: 'integrated', method: 'telex' },
      { type: 'text', t: 1000, value: 'Em yeu' },
      { type: 'clear', t: 3001 },
      { type: 'mode', t: 5100, mode: 'system', method: 'vni' },
      { type: 'text', t: 6000, value: 'Em yêu trường em.'.normalize('NFD') },
      { type: 'finish', t: 7000 },
    ],
  });
  expect(r.body).toMatchObject({ passed: true, durationMs: 4000, accuracy: 1 });
  const pausedId = await begin('keyboard-letters');
  await student.post(`/api/attempts/${pausedId}/pause`).send({ paused: true });
  const a = await db.attempt.findUniqueOrThrow({ where: { id: pausedId } });
  const pause = JSON.parse(a.pauseLog)[0].at;
  expect(
    (
      await student
        .post(`/api/typing/attempts/${pausedId}/result`)
        .send({
          events: [
            {
              type: 'down',
              t: pause - a.startedAt.getTime() + 1,
              code: 'KeyA',
              key: 'a',
            },
          ],
        })
    ).status,
  ).toBe(409);
});
it('integrates classroom permissions and rejects events while teacher paused or finished', async () => {
  const studentInRoom = request.agent(app);
  const room = await teacher
    .post('/api/rooms')
    .send({ name: 'Lớp luyện gõ', lessonId: 'keyboard-letters' });
  const code = room.body.code;
  await studentInRoom
    .post('/api/rooms/join')
    .send({ code, name: 'Bạn luyện gõ' });
  expect(
    (
      await studentInRoom
        .post('/api/typing/attempts')
        .send({ lessonId: 'keyboard-letters' })
    ).status,
  ).toBe(409);
  for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
    expect(
      (await teacher.post(`/api/rooms/${code}/state`).send({ revision, state }))
        .status,
    ).toBe(200);
  expect(
    (
      await studentInRoom
        .post('/api/typing/attempts')
        .send({ lessonId: 'vietnamese-sentence' })
    ).status,
  ).toBe(409);
  const id = await begin('keyboard-letters', studentInRoom);
  await teacher
    .post(`/api/rooms/${code}/state`)
    .send({ state: 'PAUSED', revision: 3 });
  const a = await db.attempt.findUniqueOrThrow({
    where: { id },
    include: { session: true },
  });
  const at = JSON.parse(a.session!.controlLog).at(-1).at;
  expect(
    (
      await studentInRoom
        .post(`/api/typing/attempts/${id}/result`)
        .send({
          events: [
            {
              type: 'down',
              code: 'KeyA',
              key: 'a',
              t: at - a.startedAt.getTime() + 1,
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
    data: { startedAt: new Date(Date.now() - 10000) },
  });
  expect(
    (
      await studentInRoom
        .post(`/api/typing/attempts/${id}/result`)
        .send({ events: events('keyboard-letters') })
    ).body.passed,
  ).toBe(true);
  expect(
    (await teacher.get('/api/reports')).body.some(
      (r: { attemptId: string }) => r.attemptId === id,
    ),
  ).toBe(true);
  expect((await foreign.get('/api/reports')).status).toBe(401);
});
