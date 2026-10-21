import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { simulationLessons, type SimulationCommand } from '@byte/shared';
import { createApp } from '../../apps/server/src/app.js';
import { db } from '../../apps/server/src/database/client.js';
import { solution } from '../helpers/simulation';
const app = createApp(),
  student = request.agent(app),
  foreign = request.agent(app),
  teacher = request.agent(app);
beforeAll(async () => {
  for (const l of simulationLessons)
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
      username: 'simulation-teacher',
      name: 'Simulation QA',
      passwordHash: await hash('simulation-only-passphrase', 4),
    },
  });
  await teacher.post('/api/auth/login').send({
    username: 'simulation-teacher',
    password: 'simulation-only-passphrase',
  });
});
afterAll(() => db.$disconnect());
async function begin(lessonId: string, agent = student) {
  const r = await agent.post('/api/simulation/attempts').send({ lessonId });
  expect([200, 201]).toContain(r.status);
  return r.body as {
    id: string;
    revision: number;
    state: {
      files: { nodes: { id: string; name: string; parentId: string }[] };
    };
  };
}
async function action(
  id: string,
  revision: number,
  command: SimulationCommand,
  agent = student,
) {
  return agent
    .post(`/api/simulation/attempts/${id}/action`)
    .send({ revision, action: command });
}
it('create → rename → move → validate → persist result, reload and reward idempotence', async () => {
  const start = await begin('files-organize');
  let revision = 0;
  for (const c of solution('files-organize')) {
    const r = await action(start.id, revision, c);
    expect(r.status).toBe(200);
    revision = r.body.revision;
  }
  const restored = await begin('files-organize');
  expect(restored.id).toBe(start.id);
  expect(restored.revision).toBe(revision);
  expect(
    restored.state.files.nodes.find((n) => n.name === 'Góc học tập'),
  ).toMatchObject({ id: 'new-1', parentId: 'study' });
  const saved = await student
    .post(`/api/simulation/attempts/${start.id}/result`)
    .send({ revision, score: 999, state: { passed: true } });
  expect(saved.status).toBe(200);
  expect(saved.body).toMatchObject({ passed: true, score: 100, stars: 3 });
  expect(saved.body.inputLog).toBeUndefined();
  const duplicate = await student
    .post(`/api/simulation/attempts/${start.id}/result`)
    .send({ revision: 0 });
  expect(duplicate.body.id).toBe(saved.body.id);
  const attempt = await db.attempt.findUniqueOrThrow({
    where: { id: start.id },
  });
  expect(
    await db.progress.findUnique({
      where: {
        studentId_lessonId: {
          studentId: attempt.studentId,
          lessonId: 'files-organize',
        },
      },
    }),
  ).toMatchObject({ completedCount: 1, bestScore: 100 });
  expect(
    (await student.get('/api/student/overview')).body.achievements,
  ).toHaveLength(1);
});
it('does not pass on submit alone or accept a forged VFS or lesson result', async () => {
  const s = await begin('files-create');
  const r = await student.post(`/api/simulation/attempts/${s.id}/result`).send({
    revision: 0,
    state: { files: { nodes: [{ name: 'Bài tập', type: 'folder' }] } },
    passed: true,
    score: 100,
  });
  expect(r.body).toMatchObject({ passed: false, score: 0, stars: 0 });
  expect(
    (
      await student
        .post('/api/simulation/attempts')
        .send({ lessonId: 'mouse-intro' })
    ).status,
  ).toBe(409);
  expect(
    (
      await student
        .post('/api/simulation/attempts')
        .send({ lessonId: '../../private' })
    ).status,
  ).toBe(409);
});
it('keeps ownership, revisions, invalid actions and atomic rollback safe', async () => {
  const s = await begin('files-create');
  expect((await foreign.get(`/api/simulation/attempts/${s.id}`)).status).toBe(
    404,
  );
  expect(
    (
      await action(
        s.id,
        0,
        { domain: 'files', command: { type: 'delete', id: 'root' } },
        foreign,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await foreign
        .post(`/api/simulation/attempts/${s.id}/result`)
        .send({ revision: 0 })
    ).status,
  ).toBe(404);
  expect(
    (
      await action(s.id, 0, {
        domain: 'files',
        command: { type: 'move', id: 'study', parentId: 'images', via: 'drag' },
      })
    ).status,
  ).toBe(409);
  expect(
    (await student.get(`/api/simulation/attempts/${s.id}`)).body.revision,
  ).toBe(0);
  expect(
    (
      await action(s.id, 0, {
        domain: 'files',
        command: { type: 'create', parentId: 'study', name: 'Bài tập' },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await action(s.id, 0, {
        domain: 'files',
        command: { type: 'create', parentId: 'study', name: 'Khác' },
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await action(s.id, 1, {
        domain: 'files',
        command: { type: 'create', parentId: 'study', name: 'bài tập' },
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await student.get(`/api/simulation/attempts/${s.id}`)
    ).body.state.files.nodes.filter(
      (n: { name: string }) => n.name === 'Bài tập',
    ),
  ).toHaveLength(1);
  expect(
    (await action(s.id, 1, { domain: 'files', command: { type: 'undo' } }))
      .status,
  ).toBe(200);
  expect((await action(s.id, 2, { domain: 'reset' })).status).toBe(200);
  const reset = await student.get(`/api/simulation/attempts/${s.id}`);
  expect(reset.body.state.files.undo).toEqual([]);
  expect(reset.body.goals[0].done).toBe(false);
});
it('all 25 simulations can be completed and saved using actual domain actions', async () => {
  const learner = request.agent(app);
  for (const l of simulationLessons) {
    const s = await begin(l.id, learner);
    let revision = s.revision;
    for (const c of solution(l.id)) {
      const r = await action(s.id, revision, c, learner);
      expect(r.status, l.id).toBe(200);
      revision = r.body.revision;
    }
    const saved = await learner
      .post(`/api/simulation/attempts/${s.id}/result`)
      .send({ revision });
    expect(saved.body, l.id).toMatchObject({ passed: true, score: 100 });
  }
  const overview = await learner.get('/api/student/overview');
  expect(overview.body.progress).toHaveLength(25);
});
it('matches classroom assignment, pauses all mutations and reports only to the owner', async () => {
  const learner = request.agent(app);
  const room = await teacher
      .post('/api/rooms')
      .send({ name: 'Lớp sắp xếp tệp', lessonId: 'files-create' }),
    code = room.body.code;
  await learner.post('/api/rooms/join').send({ code, name: 'Bạn khám phá' });
  expect(
    (
      await learner
        .post('/api/simulation/attempts')
        .send({ lessonId: 'files-create' })
    ).status,
  ).toBe(409);
  for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
    expect(
      (await teacher.post(`/api/rooms/${code}/state`).send({ revision, state }))
        .status,
    ).toBe(200);
  expect(
    (
      await learner
        .post('/api/simulation/attempts')
        .send({ lessonId: 'files-copy' })
    ).status,
  ).toBe(409);
  const s = await begin('files-create', learner);
  await teacher
    .post(`/api/rooms/${code}/state`)
    .send({ state: 'PAUSED', revision: 3 });
  expect(
    (await action(s.id, 0, solution('files-create')[0]!, learner)).status,
  ).toBe(409);
  expect((await begin('files-create', learner)).id).toBe(s.id);
  await teacher
    .post(`/api/rooms/${code}/state`)
    .send({ state: 'PLAYING', revision: 4 });
  expect(
    (await action(s.id, 0, solution('files-create')[0]!, learner)).status,
  ).toBe(200);
  await learner.post(`/api/attempts/${s.id}/pause`).send({ paused: true });
  expect((await action(s.id, 1, { domain: 'reset' }, learner)).status).toBe(
    409,
  );
  await learner.post(`/api/attempts/${s.id}/pause`).send({ paused: false });
  const saved = await learner
    .post(`/api/simulation/attempts/${s.id}/result`)
    .send({ revision: 1 });
  expect(saved.body.passed).toBe(true);
  expect(
    (await teacher.get('/api/reports')).body.some(
      (r: { id: string }) => r.id === saved.body.id,
    ),
  ).toBe(true);
  expect((await foreign.get('/api/reports')).status).toBe(401);
});
