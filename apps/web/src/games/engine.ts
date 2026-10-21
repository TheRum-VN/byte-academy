import type {
  Lesson,
  MouseAttemptTicket,
  MouseInput,
  MouseRun,
} from '@byte/shared';
import { transitionGame, type GameState } from '@byte/shared';
export interface MouseEngineOptions {
  ticket: MouseAttemptTicket;
  elapsed: () => number;
  onUpdate: (run: MouseRun) => void;
  onComplete: (events: MouseInput[]) => void;
  onError: (message: string) => void;
  onSuccess: () => void;
}
export interface MouseEngine {
  setPaused: (paused: boolean) => void;
  events: MouseInput[];
  destroy: () => void;
}
export async function createGameEngine(
  parent: HTMLElement,
  lesson: Lesson,
  options: MouseEngineOptions,
): Promise<MouseEngine> {
  if (!lesson.available) throw new Error('Bài học chưa mở gameplay.');
  const [{ default: Phaser }, { createMouseScene }] = await Promise.all([
    import('phaser'),
    import('./mouse/scene'),
  ]);
  const scene = await createMouseScene(Phaser, lesson, options);
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 560,
    transparent: true,
    // React fits the logical playfield into the available viewport space.
    // A second FIT transform would shrink the canvas twice on small viewports.
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { mouse: false, touch: false, keyboard: false },
    loader: { imageLoadType: 'HTMLImageElement' },
    render: { antialias: true },
    scene: [scene],
    banner: false,
    callbacks: {
      postBoot: () => {
        game.canvas.setAttribute('aria-label', 'Khu vườn luyện chuột');
        game.canvas.setAttribute('role', 'img');
      },
    },
  });
  try {
    await scene.whenReady;
  } catch (error) {
    game.destroy(true);
    throw error;
  }
  return {
    setPaused: (value) => scene.setPaused(value),
    events: scene.inputLog,
    destroy: () => game.destroy(true),
  };
}
export class PersonalGameSession {
  state: GameState = 'IDLE';
  constructor(
    readonly lesson: Lesson,
    readonly mode: 'free' | 'assigned',
    readonly roomSessionId?: string,
  ) {}
  transition(to: GameState) {
    this.state = transitionGame(this.state, to);
    return this.state;
  }
}
