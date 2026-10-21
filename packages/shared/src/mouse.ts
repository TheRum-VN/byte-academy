import type { Lesson } from './index.js';

export const mouseSkills = [
  {
    id: 'left',
    title: 'Click trái',
    game: 'Bong bóng sắc màu',
    sprite: 'mouse_left_press',
    instruction:
      'Click trái vào bong bóng có viền vàng. Mỗi lần chỉ nháy một lần nhé!',
  },
  {
    id: 'right',
    title: 'Click phải',
    game: 'Chiếc rương bí mật',
    sprite: 'mouse_right_press',
    instruction:
      'Click phải vào rương có viền vàng, rồi click trái chọn hành động được yêu cầu.',
  },
  {
    id: 'double',
    title: 'Nháy đúp trái',
    game: 'Mở kho báu',
    sprite: 'mouse_double_click',
    instruction:
      'Nháy nhanh hai lần nút trái vào cùng một rương có viền vàng để mở khóa.',
  },
  {
    id: 'drag',
    title: 'Kéo thả',
    game: 'Thu thập ngôi sao',
    sprite: 'mouse_drag_arrow',
    instruction:
      'Nhấn giữ nút trái trên ngôi sao, kéo vào giỏ rồi thả tay. Thu thập tất cả ngôi sao nhé!',
  },
  {
    id: 'middle',
    title: 'Click giữa',
    game: 'Cánh cổng thần kỳ',
    sprite: 'mouse_middle_press',
    instruction:
      'Em cần chuột có nút giữa: nhấn bánh xe vào cánh cổng có viền vàng để bật sáng. Touchpad không có nút giữa cần đổi sang chuột.',
  },
  {
    id: 'wheel',
    title: 'Cuộn chuột',
    game: 'Cuộn để khám phá',
    sprite: 'mouse_scroll_down',
    instruction:
      'Đặt con trỏ trong khu vườn. Lăn bánh xe xuống, lên, rồi tìm vật phẩm theo hướng dẫn. Không cần click.',
  },
] as const;
export type MouseSkillId = (typeof mouseSkills)[number]['id'];
export interface MouseConfig {
  skill: MouseSkillId;
  level: 1 | 2;
  count: number;
  size: number;
  doubleClickMs: number;
}
export const mouseLessons: Lesson[] = mouseSkills.flatMap((skill) =>
  ([1, 2] as const).map((level) => {
    const count =
      skill.id === 'drag'
        ? level === 1
          ? 5
          : 8
        : skill.id === 'wheel'
          ? 3
          : level === 1
            ? 3
            : 5;
    return {
      id: `mouse-${skill.id}-${level}`,
      module: 'mouse',
      skill: `mouse.${skill.id}`,
      title: `${skill.game} · Cấp ${level}`,
      instructions: [skill.instruction],
      gradeMin: 1,
      gradeMax: 5,
      difficulty: level,
      targetCount: count,
      completionRules: { minAccuracy: 0.6 },
      scoringRules: { pointsPerTarget: 100 / count, maxScore: 100 },
      rewards: [
        { id: `mouse-${skill.id}-${level}-stars`, title: skill.game, stars: 3 },
      ],
      config: {
        skill: skill.id,
        level,
        count,
        size: level === 1 ? 110 : 86,
        doubleClickMs: 650,
      },
      available: true,
    };
  }),
);
export function mouseConfig(
  lesson: Lesson,
  doubleClickMs?: number,
): MouseConfig {
  if (!mouseLessons.some((l) => l.id === lesson.id))
    throw new Error('Bài học chuột không hợp lệ.');
  return {
    ...lesson.config,
    doubleClickMs: Math.min(1000, Math.max(300, doubleClickMs ?? 650)),
  } as unknown as MouseConfig;
}
export function nextMouseLesson(id: string): Lesson | undefined {
  const index = mouseLessons.findIndex((l) => l.id === id);
  return index < 0 ? undefined : mouseLessons[index + 1];
}
export interface Point {
  x: number;
  y: number;
}
export interface MouseInput extends Point {
  type: 'down' | 'move' | 'up' | 'cancel' | 'wheel';
  button: number;
  t: number;
  deltaY?: number;
}
export interface MouseTarget extends Point {
  id: number;
  size: number;
  done: boolean;
}
export interface MouseSummary {
  score: number;
  stars: number;
  accuracy: number;
  correctActions: number;
  wrongActions: number;
  completedTargets: number;
  passed: boolean;
  durationMs: number;
}
export interface MouseAttemptTicket {
  id: string;
  lessonId: string;
  seed: number;
  startedAt: string;
  doubleClickMs: number;
}
export const garden = {
  width: 960,
  height: 560,
  basket: { x: 805, y: 425, width: 170, height: 150 },
};
export function insideDrop(p: Point): boolean {
  const b = garden.basket;
  return (
    Math.abs(p.x - b.x) <= b.width / 2 && Math.abs(p.y - b.y) <= b.height / 2
  );
}
export function wheelDirection(deltaY: number): 'up' | 'down' | null {
  return deltaY > 0 ? 'down' : deltaY < 0 ? 'up' : null;
}
export function menuRects(p: Point) {
  const x = Math.min(730, Math.max(10, p.x));
  const y = Math.min(400, Math.max(10, p.y));
  return [
    { x, y, width: 215, height: 56 },
    { x, y: y + 56, width: 215, height: 56 },
  ];
}
export const wheelItems = [
  { name: 'Quả táo', sprite: 'apple_red' },
  { name: 'Mảnh ghép xanh', sprite: 'puzzle_piece_blue' },
  { name: 'Chìa khóa vàng', sprite: 'key_gold' },
  { name: 'Hộp quà', sprite: 'gift_box_closed' },
  { name: 'Quả xoài', sprite: 'mango_yellow' },
  { name: 'Kho báu', sprite: 'treasure_chest_closed' },
];
/** Pure input reducer, shared by Phaser and server replay. No DOM or client score is trusted. */
export class MouseRun {
  targets: MouseTarget[];
  correctActions = 0;
  wrongActions = 0;
  completedTargets = 0;
  menu: { target: number; x: number; y: number } | null = null;
  scroll = 0;
  wheelTravel = 0;
  feedback = '';
  lastCompleted = -1;
  private down: {
    p: MouseInput;
    target: number;
    offset: Point;
    moved: boolean;
  } | null = null;
  private first: { target: number; t: number } | null = null;
  private lastT = 0;
  private wheelWinAt = -Infinity;
  constructor(
    readonly config: MouseConfig,
    readonly seed: number,
  ) {
    this.targets = Array.from({ length: config.count }, (_, id) => ({
      id,
      x: 170 + (id % 3) * 230 + (seed % 31),
      y: 175 + Math.floor(id / 3) * 125,
      size: config.size,
      done: false,
    }));
    if (config.skill === 'drag')
      this.targets.forEach((p, i) => {
        p.x = 115 + (i % 3) * 210;
        p.y = 170 + Math.floor(i / 3) * 130;
      });
    if (config.skill === 'wheel' && config.level === 2) this.scroll = 300;
  }
  get complete() {
    return this.completedTargets === this.config.count;
  }
  get activeTarget() {
    return this.targets.find((t) => !t.done)?.id ?? -1;
  }
  position(target: MouseTarget, t: number): Point {
    if (this.config.skill === 'left')
      return {
        x:
          target.x +
          Math.sin(t / 2200 + target.id) * (this.config.level === 1 ? 5 : 28),
        y: target.y + Math.sin(t / 2800) * (this.config.level === 1 ? 3 : 15),
      };
    return target;
  }
  get dragging() {
    return this.down && this.config.skill === 'drag'
      ? (this.targets[this.down.target] ?? null)
      : null;
  }
  private hit(p: Point, t: number): number {
    return this.targets.findIndex((target) => {
      if (target.done) return false;
      const pos = this.position(target, t);
      return (
        Math.abs(p.x - pos.x) <= target.size * 0.43 &&
        Math.abs(p.y - pos.y) <= target.size * 0.43
      );
    });
  }
  private wrong(
    text = 'Thử lại nhẹ nhàng nhé! Nhìn hướng dẫn và nháy đúng nút chuột.',
  ) {
    this.wrongActions++;
    this.feedback = text;
    this.first = null;
  }
  private win(id: number) {
    const target = this.targets[id];
    if (!target || target.done) return;
    target.done = true;
    this.completedTargets++;
    this.correctActions++;
    this.lastCompleted = id;
    this.feedback = this.complete
      ? 'Em đã hoàn thành! Byte rất vui được học cùng em.'
      : 'Chính xác! Em làm tốt lắm, tiếp tục nhé!';
    this.first = null;
    this.menu = null;
  }
  cancel() {
    if (this.dragging)
      Object.assign(this.dragging, this.origin(this.dragging.id));
    this.down = null;
    this.first = null;
    this.menu = null;
  }
  private origin(id: number): Point {
    return { x: 115 + (id % 3) * 210, y: 170 + Math.floor(id / 3) * 130 };
  }
  input(e: MouseInput, playing = true) {
    if (!playing || this.complete || e.t < this.lastT) return;
    this.lastT = e.t;
    if (e.type === 'cancel') {
      this.cancel();
      return;
    }
    if (e.type === 'wheel') {
      if (this.config.skill !== 'wheel') return;
      this.wheel(e);
      return;
    }
    if (e.type === 'down') {
      if (this.down) {
        this.cancel();
        this.wrong();
        return;
      }
      const target = this.hit(e, e.t);
      const pos = this.targets[target];
      this.down = {
        p: e,
        target,
        offset: { x: e.x - (pos?.x ?? e.x), y: e.y - (pos?.y ?? e.y) },
        moved: false,
      };
      if (
        this.config.skill === 'right' &&
        e.button === 2 &&
        target === this.activeTarget
      ) {
        this.menu = { target, x: e.x, y: e.y };
        this.feedback = `Chọn “${this.config.level === 1 ? 'Mở rương' : 'Xem vật phẩm'}” nhé!`;
      }
      return;
    }
    const down = this.down;
    if (!down) return;
    if (e.type === 'move') {
      if (Math.hypot(e.x - down.p.x, e.y - down.p.y) > 8) down.moved = true;
      if (
        this.config.skill === 'drag' &&
        down.p.button === 0 &&
        this.dragging
      ) {
        this.dragging.x = e.x - down.offset.x;
        this.dragging.y = e.y - down.offset.y;
      }
      return;
    }
    if (e.type !== 'up' || e.button !== down.p.button) return;
    if (Math.hypot(e.x - down.p.x, e.y - down.p.y) > 8) down.moved = true;
    if (this.config.skill === 'drag') {
      const target = this.targets[down.target];
      if (e.button === 0 && target && !target.done) {
        const final = { x: e.x - down.offset.x, y: e.y - down.offset.y };
        if (down.moved && insideDrop(final)) this.win(target.id);
        else {
          Object.assign(target, this.origin(target.id));
          this.wrong('Giữ nút trái, kéo sao vào trong giỏ rồi mới thả nhé!');
        }
      } else this.wrong();
      this.down = null;
      return;
    }
    this.down = null;
    const click = !down.moved && e.t - down.p.t <= 450;
    const hit = this.hit(e, e.t);
    if (this.config.skill === 'right') {
      if (e.button === 2 && click && hit === this.activeTarget) return;
      if (e.button === 0 && click && this.menu) {
        const choice = menuRects(this.menu).findIndex(
          (r) =>
            e.x >= r.x &&
            e.x <= r.x + r.width &&
            e.y >= r.y &&
            e.y <= r.y + r.height,
        );
        if (choice === (this.config.level === 1 ? 0 : 1)) {
          this.win(this.menu.target);
          return;
        }
      }
      this.menu = null;
      this.wrong(
        'Dùng nút phải trên rương trước, rồi chọn đúng hành động nhé!',
      );
      return;
    }
    if (this.config.skill === 'wheel') return;
    const expected = this.config.skill === 'middle' ? 1 : 0;
    if (
      !click ||
      e.button !== expected ||
      hit !== down.target ||
      hit !== this.activeTarget
    ) {
      this.wrong();
      return;
    }
    if (this.config.skill === 'double') {
      if (
        this.first &&
        this.first.target === hit &&
        down.p.t - this.first.t >= 30 &&
        e.t - this.first.t <= this.config.doubleClickMs
      )
        this.win(hit);
      else {
        if (this.first)
          this.wrong('Hai lần nháy cần gần nhau hơn. Thử nháy đúp lại nhé!');
        this.first = { target: hit, t: e.t };
        this.feedback = 'Thêm một nháy trái thật nhanh vào cùng rương nhé!';
      }
    } else this.win(hit);
  }
  get wheelGoal() {
    const find = this.config.level === 1 ? 3 : 4;
    return this.completedTargets === 0
      ? { direction: 'down' as const, offset: 1200, item: 5 }
      : this.completedTargets === 1
        ? { direction: 'up' as const, offset: 0, item: 0 }
        : { direction: 'down' as const, offset: find * 240, item: find };
  }
  private wheel(e: MouseInput) {
    const direction = wheelDirection(e.deltaY ?? 0);
    if (!direction) return;
    const goal = this.wheelGoal;
    // A short settling period ignores residual wheel ticks from the previous task.
    if (
      direction !== goal.direction &&
      this.completedTargets > 0 &&
      e.t - this.wheelWinAt < 500
    )
      return;
    const delta = Math.max(-160, Math.min(160, e.deltaY ?? 0));
    this.scroll = Math.max(0, Math.min(1200, this.scroll + delta));
    if (direction !== goal.direction) {
      this.wrong(
        `Lăn bánh xe ${goal.direction === 'down' ? 'xuống' : 'lên'} để tìm ${wheelItems[goal.item]!.name} nhé!`,
      );
      return;
    }
    this.wheelTravel += Math.abs(delta);
    if (Math.abs(this.scroll - goal.offset) <= 65 && this.wheelTravel >= 160) {
      this.win(this.completedTargets);
      this.wheelTravel = 0;
      this.wheelWinAt = e.t;
    }
  }
  summary(durationMs: number): MouseSummary {
    const accuracy =
      this.correctActions /
      Math.max(1, this.correctActions + this.wrongActions);
    const completion = this.completedTargets / this.config.count;
    const bonus = this.complete && durationMs <= 120000 ? 5 : 0;
    const score = Math.min(
      100,
      Math.round(completion * 60 + accuracy * completion * 35 + bonus),
    );
    const passed = this.complete && accuracy >= 0.6;
    const stars = this.complete
      ? passed && score >= 90
        ? 3
        : passed && score >= 75
          ? 2
          : 1
      : 0;
    return {
      score,
      stars,
      accuracy,
      correctActions: this.correctActions,
      wrongActions: this.wrongActions,
      completedTargets: this.completedTargets,
      passed,
      durationMs,
    };
  }
}
