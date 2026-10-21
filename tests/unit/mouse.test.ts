import { completeRun } from '../helpers/mouse';
import { describe, it, expect } from 'vitest';
import {
  MouseRun,
  mouseConfig,
  mouseLessons,
  nextMouseLesson,
  insideDrop,
  wheelDirection,
  menuRects,
} from '@byte/shared';
function setup(skill: string, level = 1) {
  return new MouseRun(
    mouseConfig(mouseLessons.find((l) => l.id === `mouse-${skill}-${level}`)!),
    42,
  );
}
function click(
  run: MouseRun,
  button = 0,
  t = 0,
  id = run.activeTarget,
  hold = 60,
) {
  const pos = run.position(run.targets[id]!, t);
  run.input({ ...pos, type: 'down', button, t });
  run.input({ ...pos, type: 'up', button, t: t + hold });
}
describe('real mouse rules', () => {
  for (const skill of ['left', 'right', 'double', 'middle'])
    it(`${skill} rejects other buttons and held clicks`, () => {
      const run = setup(skill);
      for (const button of [0, 1, 2].filter(
        (b) => b !== (skill === 'middle' ? 1 : skill === 'right' ? 2 : 0),
      ))
        click(run, button, run.wrongActions * 100);
      expect(run.completedTargets).toBe(0);
      expect(run.wrongActions).toBeGreaterThan(0);
      click(
        run,
        skill === 'middle' ? 1 : skill === 'right' ? 2 : 0,
        1000,
        0,
        700,
      );
      expect(run.completedTargets).toBe(0);
    });
  it('double-click is two short left clicks on the same target within configured time', () => {
    const run = setup('double');
    click(run, 0, 0);
    click(run, 0, 1000);
    expect(run.completedTargets).toBe(0);
    click(run, 0, 1140);
    expect(run.completedTargets).toBe(1);
    click(run, 0, 1300, 0);
    expect(run.completedTargets).toBe(1);
    const slow = new MouseRun(
      { ...setup('double').config, doubleClickMs: 900 },
      42,
    );
    click(slow, 0, 0);
    click(slow, 0, 800);
    expect(slow.completedTargets).toBe(1);
  });
  it('breaks a pending double-click when a wrong button or pause intervenes', () => {
    const run = setup('double');
    click(run, 0, 0);
    click(run, 2, 90);
    click(run, 0, 180);
    expect(run.completedTargets).toBe(0);
    run.cancel();
    click(run, 0, 270);
    expect(run.completedTargets).toBe(0);
    click(run, 0, 360);
    expect(run.completedTargets).toBe(1);
  });
  it('requires the true right button to establish a context action', () => {
    const run = setup('right');
    click(run, 0);
    expect(run.menu).toBeNull();
    click(run, 2, 200);
    expect(run.menu).not.toBeNull();
    const rect = menuRects(run.menu!)[1]!;
    run.input({
      type: 'down',
      button: 0,
      t: 300,
      x: rect.x + 20,
      y: rect.y + 20,
    });
    run.input({
      type: 'up',
      button: 0,
      t: 350,
      x: rect.x + 20,
      y: rect.y + 20,
    });
    expect(run.completedTargets).toBe(0);
  });
  it('preserves drag offset and returns invalid/cancelled drops to origin', () => {
    const run = setup('drag');
    const target = run.targets[0]!;
    const initial = { x: target.x, y: target.y };
    run.input({
      type: 'down',
      button: 0,
      t: 0,
      x: target.x + 15,
      y: target.y + 10,
    });
    run.input({ type: 'move', button: -1, t: 40, x: 300, y: 300 });
    expect(target.x).toBe(285);
    expect(target.y).toBe(290);
    run.input({ type: 'up', button: 0, t: 80, x: 300, y: 300 });
    expect(target).toMatchObject(initial);
    expect(run.completedTargets).toBe(0);
    run.input({ type: 'down', button: 0, t: 100, ...initial });
    run.input({ type: 'move', button: -1, t: 120, x: 800, y: 420 });
    run.input({ type: 'cancel', button: -1, t: 140, x: 0, y: 0 });
    expect(target).toMatchObject(initial);
    click(run, 2, 200);
    expect(run.completedTargets).toBe(0);
    expect(insideDrop({ x: 720, y: 350 })).toBe(true);
    expect(insideDrop({ x: 719, y: 350 })).toBe(false);
  });
  it('ignores input while paused, then resumes without awarding a click pair across pause', () => {
    const run = setup('left');
    const p = run.position(run.targets[0]!, 0);
    run.input({ ...p, type: 'down', button: 0, t: 0 }, false);
    run.input({ ...p, type: 'up', button: 0, t: 60 }, false);
    expect(run.correctActions).toBe(0);
    click(run, 0, 100);
    expect(run.correctActions).toBe(1);
  });
  it('requires wheel direction and real travel; a click cannot pass wheel goals', () => {
    expect(wheelDirection(-1)).toBe('up');
    expect(wheelDirection(1)).toBe('down');
    expect(wheelDirection(0)).toBeNull();
    const run = setup('wheel');
    click(run);
    expect(run.completedTargets).toBe(0);
    run.input({
      type: 'wheel',
      x: 480,
      y: 280,
      button: -1,
      t: 100,
      deltaY: -100,
    });
    expect(run.completedTargets).toBe(0);
    expect(run.wrongActions).toBe(1);
  });
  for (const lesson of mouseLessons)
    it(`completes ${lesson.id} with capped score and one reward per target`, () => {
      const run = new MouseRun(mouseConfig(lesson), 42);
      const events = completeRun(run);
      expect(run.complete).toBe(true);
      const summary = run.summary(20000);
      expect(summary).toMatchObject({
        score: 100,
        stars: 3,
        passed: true,
        completedTargets: lesson.targetCount,
        wrongActions: 0,
      });
      const replay = new MouseRun(mouseConfig(lesson), 42);
      for (const event of events) replay.input(event);
      expect(replay.summary(20000)).toEqual(summary);
      for (let i = 0; i < 100; i++) click(run, 0, 100000 + i * 100, 0);
      expect(run.summary(20000)).toEqual(summary);
    });
  it('ignores residual wheel momentum briefly when switching direction tasks', () => {
    const run = setup('wheel', 2);
    for (let i = 1; i <= 7; i++)
      run.input({
        type: 'wheel',
        x: 480,
        y: 280,
        button: -1,
        t: i * 50,
        deltaY: 120,
      });
    expect(run.completedTargets).toBe(1);
    run.input({
      type: 'wheel',
      x: 480,
      y: 280,
      button: -1,
      t: 400,
      deltaY: 120,
    });
    expect(run.wrongActions).toBe(0);
    run.input({
      type: 'wheel',
      x: 480,
      y: 280,
      button: -1,
      t: 1000,
      deltaY: 120,
    });
    expect(run.wrongActions).toBe(1);
  });
  it('uses accuracy and completion more than speed, with a clear pass threshold', () => {
    const run = setup('left');
    completeRun(run);
    expect(run.summary(600000).score).toBe(95);
    expect(run.summary(600000).stars).toBe(3);
    const spam = setup('left');
    for (let i = 0; i < 10; i++) click(spam, 2, i * 100);
    completeRun(spam, 2000);
    expect(spam.summary(20000).passed).toBe(false);
    expect(spam.summary(20000).score).toBeLessThan(100);
    expect(spam.summary(20000).stars).toBe(1);
  });
  it('orders twelve levels and stops after the final wheel lesson', () => {
    expect(nextMouseLesson('mouse-left-1')?.id).toBe('mouse-left-2');
    expect(nextMouseLesson('mouse-wheel-2')).toBeUndefined();
    expect(nextMouseLesson('unknown')).toBeUndefined();
  });
});
