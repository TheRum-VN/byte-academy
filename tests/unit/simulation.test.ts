import { describe, it, expect } from 'vitest';
import {
  createFileSeed,
  applyVfs,
  assertVfs,
  getNode,
  isTrashed,
  visibleFiles,
  breadcrumb,
  createDesktop,
  applyDesktop,
  windowStatus,
  createSimulation,
  applySimulation,
  simulationGoals,
  simulationSummary,
  simulationLessons,
  simulationDefinition,
  type VfsCommand,
} from '@byte/shared';
import { solution } from '../helpers/simulation';
const now = '2026-10-21T03:00:00.000Z',
  later = '2026-10-21T03:01:00.000Z';
describe('transactional virtual file system', () => {
  it('has stable IDs, nested folders and correct format metadata for all eight sample files', () => {
    const s = createFileSeed(1, now);
    assertVfs(s);
    expect(s.nodes.filter((n) => n.type === 'file')).toHaveLength(8);
    expect(getNode(s, 'flower')).toMatchObject({
      parentId: 'study',
      name: 'Hoa.jpg',
      fileExtension: 'jpg',
      mimeType: 'image/jpeg',
      createdAt: now,
    });
    expect(
      breadcrumb(applyVfs(s, { type: 'open', id: 'images' }, later)).map(
        (n) => n.id,
      ),
    ).toEqual(['root', 'study', 'images']);
  });
  it('creates, renames and updates timestamps without changing identity', () => {
    let s = createFileSeed(2, now);
    s = applyVfs(
      s,
      { type: 'create', parentId: 'study', name: '  Bài tập  ' },
      now,
    );
    s = applyVfs(
      s,
      { type: 'rename', id: 'new-1', name: 'Góc học tập' },
      later,
    );
    expect(getNode(s, 'new-1')).toMatchObject({
      name: 'Góc học tập',
      createdAt: now,
      updatedAt: later,
      metadata: { originalName: 'Bài tập', previousNames: ['Bài tập'] },
    });
  });
  for (const name of [
    '',
    '   ',
    '.',
    '..',
    'a/b',
    'a\\b',
    'Con',
    'NUL.txt',
    'Tên?',
    'x.',
  ])
    it(`rejects invalid name ${JSON.stringify(name)} atomically`, () => {
      const s = createFileSeed(2, now),
        copy = structuredClone(s);
      expect(() =>
        applyVfs(s, { type: 'create', parentId: 'study', name }, later),
      ).toThrow();
      expect(s).toEqual(copy);
    });
  it('rejects duplicate names with Vietnamese NFC/case normalization', () => {
    const s = createFileSeed(2, now);
    expect(() =>
      applyVfs(
        s,
        { type: 'create', parentId: 'study', name: 'Hình ảnh' },
        later,
      ),
    ).toThrow('đã có');
    expect(() =>
      applyVfs(s, { type: 'rename', id: 'docs', name: 'HÌNH ẢNH' }, later),
    ).toThrow('đã có');
    expect(
      applyVfs(
        s,
        { type: 'create', parentId: 'archive', name: 'Hình ảnh' },
        later,
      ).nodes,
    ).toHaveLength(s.nodes.length + 1);
  });
  it('rejects root changes, folder cycles, file destinations and moving to the same parent', () => {
    const s = createFileSeed(2, now);
    const commands: VfsCommand[] = [
      { type: 'delete', id: 'root' },
      { type: 'rename', id: 'root', name: 'x' },
      { type: 'move', id: 'study', parentId: 'study', via: 'drag' },
      { type: 'move', id: 'study', parentId: 'images', via: 'drag' },
      { type: 'move', id: 'cat', parentId: 'flower', via: 'menu' },
      { type: 'move', id: 'cat', parentId: 'study', via: 'menu' },
    ];
    for (const c of commands) {
      expect(() => applyVfs(s, c, later)).toThrow();
      assertVfs(s);
    }
  });
  it('deletes a whole tree to trash, restores it and refuses operations on trashed descendants', () => {
    let s = createFileSeed(2, now);
    s = applyVfs(
      s,
      { type: 'move', id: 'cat', parentId: 'images', via: 'menu' },
      later,
    );
    s = applyVfs(s, { type: 'delete', id: 'study' }, later);
    expect(isTrashed(s, 'cat')).toBe(true);
    expect(
      visibleFiles(applyVfs(s, { type: 'trash' }, later)).map((n) => n.id),
    ).toEqual(['study']);
    expect(() => applyVfs(s, { type: 'open', id: 'images' }, later)).toThrow();
    s = applyVfs(s, { type: 'restore', id: 'study' }, later);
    expect(isTrashed(s, 'cat')).toBe(false);
    expect(getNode(s, 'cat').parentId).toBe('images');
  });
  it('keeps deleted items when restore has a conflicting name', () => {
    let s = applyVfs(
      createFileSeed(2, now),
      { type: 'delete', id: 'docs' },
      later,
    );
    s = applyVfs(
      s,
      { type: 'create', parentId: 'study', name: 'Tài liệu' },
      later,
    );
    expect(() => applyVfs(s, { type: 'restore', id: 'docs' }, later)).toThrow(
      'đã có',
    );
    expect(getNode(s, 'docs').metadata.trashed).toBe(true);
  });
  it('copies a subtree with new stable IDs, original parent retained and no shared references', () => {
    let s = createFileSeed(2, now);
    s = applyVfs(
      s,
      { type: 'move', id: 'cat', parentId: 'images', via: 'menu' },
      later,
    );
    s = applyVfs(s, { type: 'copy', id: 'study' }, later);
    s = applyVfs(s, { type: 'paste', parentId: 'archive' }, later);
    const clone = s.nodes.find((n) => n.metadata.copiedFrom === 'study')!,
      clonedCat = s.nodes.find((n) => n.metadata.copiedFrom === 'cat')!;
    expect(clone.id).not.toBe('study');
    expect(clone.parentId).toBe('archive');
    expect(clonedCat.parentId).not.toBe('images');
    expect(getNode(s, 'study').parentId).toBe('root');
    s = applyVfs(s, { type: 'rename', id: clone.id, name: 'Bản khác' }, later);
    expect(getNode(s, 'study').name).toBe('Học tập');
    assertVfs(s);
  });
  it('copy/paste in the same folder generates a safe copy name; invalid paste preserves cut clipboard', () => {
    let s = createFileSeed(2, now);
    s = applyVfs(s, { type: 'copy', id: 'flower' }, later);
    s = applyVfs(s, { type: 'paste', parentId: 'study' }, later);
    expect(s.nodes.find((n) => n.metadata.copiedFrom === 'flower')?.name).toBe(
      'Hoa - Bản sao.jpg',
    );
    s = applyVfs(s, { type: 'cut', id: 'study' }, later);
    const old = structuredClone(s);
    expect(() =>
      applyVfs(s, { type: 'paste', parentId: 'images' }, later),
    ).toThrow();
    expect(s).toEqual(old);
    s = applyVfs(s, { type: 'cut', id: 'flower' }, later);
    s = applyVfs(s, { type: 'paste', parentId: 'images' }, later);
    expect(getNode(s, 'flower').parentId).toBe('images');
    expect(s.clipboard).toBeNull();
  });
  it('undo restores data and never reuses generated IDs', () => {
    let s = applyVfs(
      createFileSeed(2, now),
      { type: 'create', parentId: 'study', name: 'A' },
      later,
    );
    s = applyVfs(s, { type: 'undo' }, later);
    expect(s.nodes.some((n) => n.name === 'A')).toBe(false);
    s = applyVfs(s, { type: 'create', parentId: 'study', name: 'B' }, later);
    expect(s.nodes.find((n) => n.name === 'B')?.id).toBe('new-2');
    s = applyVfs(s, { type: 'delete', id: 'song' }, later);
    s = applyVfs(s, { type: 'undo' }, later);
    expect(isTrashed(s, 'song')).toBe(false);
  });
  it('searches recursively, sorts by extension, navigates breadcrumbs and back', () => {
    let s = applyVfs(
      createFileSeed(1, now),
      { type: 'search', query: '.mp' },
      later,
    );
    expect(visibleFiles(s).map((n) => n.id)).toEqual(['song', 'movie']);
    s = applyVfs(s, { type: 'open', id: 'study' }, later);
    s = applyVfs(s, { type: 'open', id: 'images' }, later);
    s = applyVfs(s, { type: 'back' }, later);
    expect(s.currentId).toBe('study');
    s = applyVfs(s, { type: 'sort', sort: 'type' }, later);
    expect(
      visibleFiles(s)
        .filter((n) => n.type === 'file')
        .map((n) => n.fileExtension),
    ).toEqual(['docx', 'jpg', 'mp3', 'mp4', 'pdf', 'png', 'pptx', 'xlsx']);
  });
  it('failed drop and serialization never lose nodes', () => {
    let s = createFileSeed(2, now);
    const before = JSON.stringify(s);
    expect(() =>
      applyVfs(
        s,
        { type: 'move', id: 'study', parentId: 'images', via: 'drag' },
        later,
      ),
    ).toThrow();
    expect(JSON.stringify(s)).toBe(before);
    s = applyVfs(
      s,
      { type: 'move', id: 'cat', parentId: 'images', via: 'drag' },
      later,
    );
    const saved = JSON.parse(JSON.stringify(s));
    assertVfs(saved);
    expect(saved).toEqual(s);
  });
});
describe('window management', () => {
  it('implements open/close/minimized/maximized/focus/background and taskbar restore', () => {
    let s = createDesktop();
    expect(windowStatus(s, 'notes')).toBe('Closed');
    s = applyDesktop(s, { type: 'launch', id: 'notes' });
    expect(windowStatus(s, 'notes')).toBe('Focused');
    s = applyDesktop(s, { type: 'launch', id: 'gallery' });
    expect(windowStatus(s, 'notes')).toBe('Background');
    s = applyDesktop(s, { type: 'focus', id: 'notes' });
    expect(s.windows[0]!.z).toBeGreaterThan(s.windows[1]!.z);
    s = applyDesktop(s, { type: 'maximize', id: 'notes' });
    expect(windowStatus(s, 'notes')).toBe('Maximized');
    s = applyDesktop(s, { type: 'minimize', id: 'notes' });
    expect(windowStatus(s, 'notes')).toBe('Minimized');
    s = applyDesktop(s, { type: 'taskbar', id: 'notes' });
    expect(windowStatus(s, 'notes')).toBe('Maximized');
    s = applyDesktop(s, { type: 'close', id: 'notes' });
    expect(windowStatus(s, 'notes')).toBe('Closed');
    expect(s.focused).toBe('gallery');
  });
  it('bounds move/resize and refuses hidden or maximized dragging', () => {
    let s = applyDesktop(createDesktop(), { type: 'launch', id: 'notes' });
    s = applyDesktop(s, { type: 'drag', id: 'notes', x: 5000, y: -10 });
    expect(s.windows[0]).toMatchObject({ x: 580, y: 0 });
    s = applyDesktop(s, {
      type: 'resize',
      id: 'notes',
      width: 100,
      height: 5000,
    });
    expect(s.windows[0]).toMatchObject({ width: 280, height: 550 });
    s = applyDesktop(s, { type: 'maximize', id: 'notes' });
    expect(() =>
      applyDesktop(s, { type: 'drag', id: 'notes', x: 30, y: 30 }),
    ).toThrow();
    expect(() =>
      applyDesktop(createDesktop(), {
        type: 'resize',
        id: 'notes',
        width: 500,
        height: 300,
      }),
    ).toThrow();
  });
});
describe('lesson validation and persistence', () => {
  it('renaming an image to a video extension cannot pass image classification', () => {
    let s = createSimulation(
      simulationDefinition(
        simulationLessons.find((l) => l.id === 'files-images')!,
      ),
      now,
    );
    s = applySimulation(
      s,
      {
        domain: 'files',
        command: { type: 'rename', id: 'flower', name: 'Hoa.mp4' },
      },
      later,
    );
    for (const id of ['flower', 'cat'])
      s = applySimulation(
        s,
        {
          domain: 'files',
          command: { type: 'move', id, parentId: 'images', via: 'menu' },
        },
        later,
      );
    expect(simulationSummary(s, 1000).passed).toBe(false);
  });
  for (const lesson of simulationLessons)
    it(`${lesson.id} rejects initial state and passes a real solution after JSON reload`, () => {
      let s = createSimulation(simulationDefinition(lesson), now);
      expect(simulationSummary(s, 0).passed).toBe(false);
      for (const c of solution(lesson.id)) s = applySimulation(s, c, later);
      s = JSON.parse(JSON.stringify(s));
      expect(
        simulationGoals(s).every((g) => g.done),
        lesson.id,
      ).toBe(true);
      expect(simulationSummary(s, 1000)).toMatchObject({
        passed: true,
        score: 100,
        stars: 3,
      });
      const reset = applySimulation(s, { domain: 'reset' }, later);
      expect(simulationSummary(reset, 0).passed).toBe(false);
    });
  it('a fake folder name or copy does not substitute for the required node and drag provenance', () => {
    let s = createSimulation(
      simulationDefinition(
        simulationLessons.find((l) => l.id === 'files-drag')!,
      ),
      now,
    );
    s = applySimulation(
      s,
      {
        domain: 'files',
        command: {
          type: 'move',
          id: 'homework',
          parentId: 'docs',
          via: 'menu',
        },
      },
      later,
    );
    expect(simulationSummary(s, 1000).passed).toBe(false);
  });
  it('wrong quiz choices do not complete a question; retries are allowed and scores are real', () => {
    let s = createSimulation(
      simulationDefinition(
        simulationLessons.find((l) => l.id === 'safety-password')!,
      ),
      now,
    );
    s = applySimulation(
      s,
      { domain: 'quiz', questionId: 'password', choiceId: 'weak' },
      later,
    );
    expect(simulationSummary(s, 1000)).toMatchObject({
      passed: false,
      wrongActions: 1,
      stars: 0,
    });
    s = applySimulation(
      s,
      { domain: 'quiz', questionId: 'password', choiceId: 'strong' },
      later,
    );
    expect(simulationSummary(s, 1000)).toMatchObject({
      passed: true,
      accuracy: 0.5,
      stars: 1,
    });
  });
  it('reset/undo in one lesson cannot mutate another lesson', () => {
    const a = createSimulation(
        simulationDefinition(simulationLessons[1]!),
        now,
      ),
      b = structuredClone(a);
    const changed = applySimulation(
      a,
      {
        domain: 'files',
        command: { type: 'create', parentId: 'study', name: 'A' },
      },
      later,
    );
    applySimulation(changed, { domain: 'reset' }, later);
    expect(a).toEqual(b);
  });
});
