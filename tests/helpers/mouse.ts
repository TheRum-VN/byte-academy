import { menuRects, type MouseRun, type MouseInput } from '@byte/shared';
export function completeRun(run: MouseRun, start = 0): MouseInput[] {
  const events: MouseInput[] = [];
  let t = start;
  const send = (e: Omit<MouseInput, 't'>) => {
    const event = { ...e, t: (t += 60) };
    events.push(event);
    run.input(event);
  };
  const pair = (x: number, y: number, button: number) => {
    send({ type: 'down', x, y, button });
    send({ type: 'up', x, y, button });
  };
  if (run.config.skill === 'wheel') {
    for (let guard = 0; !run.complete && guard < 100; guard++) {
      const goal = run.wheelGoal;
      const deltaY =
        goal.direction === 'down'
          ? Math.min(120, goal.offset - run.scroll)
          : -Math.min(120, run.scroll - goal.offset);
      send({ type: 'wheel', x: 480, y: 280, button: -1, deltaY });
    }
  } else
    for (const target of run.targets) {
      const p = run.position(target, t + 60);
      if (run.config.skill === 'right') {
        pair(p.x, p.y, 2);
        const rect = menuRects(p)[run.config.level === 1 ? 0 : 1]!;
        pair(rect.x + 30, rect.y + 25, 0);
      } else if (run.config.skill === 'drag') {
        send({ type: 'down', x: p.x + 8, y: p.y + 8, button: 0 });
        send({ type: 'move', x: 813, y: 433, button: -1 });
        send({ type: 'up', x: 813, y: 433, button: 0 });
      } else {
        pair(p.x, p.y, run.config.skill === 'middle' ? 1 : 0);
        if (run.config.skill === 'double') pair(p.x, p.y, 0);
      }
    }
  return events;
}
