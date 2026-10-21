import type PhaserType from 'phaser';
import {
  MouseRun,
  mouseConfig,
  garden,
  insideDrop,
  menuRects,
  wheelItems,
  type Lesson,
  type MouseInput,
} from '@byte/shared';
import { assets } from '../../assets/registry';
import type { MouseEngineOptions } from '../engine';

export async function createMouseScene(
  Phaser: typeof PhaserType,
  lesson: Lesson,
  options: MouseEngineOptions,
) {
  const needed: [string, string][] = [
    ...[
      'tree_small',
      'tree_medium',
      'tree_tall',
      'shrub_mint',
      'grass_mound',
      'grass_tuft',
      'mushroom_red',
      'mushroom_lavender',
      'flower_pink',
      'flower_yellow',
      'flower_bush_pink',
      'daisy_cluster',
      'basket_empty',
      'basket_stars',
      'star_gold_large',
    ].map((n) => ['05', n] as [string, string]),
    ...[
      'balloon_red',
      'balloon_cyan',
      'balloon_yellow',
      'treasure_chest_closed',
      'treasure_chest_open',
      'crate_wood',
      'padlock_gold',
      'key_gold',
      ...wheelItems.map((i) => i.sprite),
    ].map((n) => ['06', n] as [string, string]),
    ['04', 'cursor_arrow'],
    ['12', 'star_gold'],
  ];
  const unique = [
    ...new Map(needed.map((pair) => [pair.join('/'), pair])).values(),
  ];
  const sprites = await Promise.all(
    unique.map(async ([atlas, name]) => ({
      key: `${atlas}/${name}`,
      path: (await assets.get(atlas, name)).path,
    })),
  );
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const whenReady = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  return new (class extends Phaser.Scene {
    readonly whenReady = whenReady;
    readonly run = new MouseRun(
      mouseConfig(lesson, options.ticket.doubleClickMs),
      options.ticket.seed,
    );
    readonly inputLog: MouseInput[] = [];
    private paused = false;
    private ready = false;
    private cleanup: (() => void)[] = [];
    private objects: PhaserType.GameObjects.Container[] = [];
    private halos: PhaserType.GameObjects.Arc[] = [];
    private menuLayer?: PhaserType.GameObjects.Container;
    private wheelLayer?: PhaserType.GameObjects.Container;
    private basket?: PhaserType.GameObjects.Image;
    private drop?: PhaserType.GameObjects.Rectangle;
    private lastMove = 0;
    private pointerId: number | null = null;
    private ended = false;
    private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    preload() {
      for (const sprite of sprites) this.load.image(sprite.key, sprite.path);
      this.load.on('loaderror', () => {
        this.ended = true;
        rejectReady(
          new Error('Không tải đủ hình ảnh khu vườn. Hãy tải lại bài.'),
        );
      });
    }
    private art(
      x: number,
      y: number,
      key: string,
      width: number,
      height = width,
    ) {
      return this.add.image(x, y, key).setDisplaySize(width, height);
    }
    create() {
      if (this.ended) return;
      if (sprites.some((sprite) => !this.textures.exists(sprite.key))) {
        rejectReady(new Error('Thiếu sprite trong khu vườn. Hãy tải lại bài.'));
        return;
      }
      this.ready = true;
      // The transparent canvas shares the full-stage landscape with the floating HUD.
      // Decorative objects stay outside the target hitboxes in every lesson.
      this.art(925, 174, '05/tree_medium', 232, 330);
      this.art(902, 327, '05/shrub_mint', 140, 86);
      this.add.ellipse(75, 401, 180, 30, 0x497c38, 0.14);
      this.art(54, 345, '05/mushroom_red', 100, 104);
      this.art(116, 372, '05/mushroom_lavender', 84, 89);
      this.art(930, 510, '05/flower_bush_pink', 92, 78);
      for (const [x, y, size] of [
        [58, 494, 28],
        [206, 422, 22],
        [352, 490, 30],
        [476, 382, 18],
        [652, 515, 22],
        [730, 350, 20],
        [900, 414, 23],
        [170, 537, 18],
      ] as const)
        this.art(x, y, '05/grass_tuft', size, size * 0.7).setAlpha(0.7);
      for (const [x, y, i] of [
        [42, 479, 0],
        [230, 465, 1],
        [655, 473, 2],
        [904, 533, 0],
        [376, 535, 1],
        [560, 390, 0],
      ] as const)
        this.art(
          x,
          y,
          ['05/flower_pink', '05/flower_yellow', '05/daisy_cluster'][i]!,
          i === 2 ? 46 : 37,
          i === 2 ? 46 : 37,
        );
      if (this.run.config.skill === 'drag') {
        const b = garden.basket;
        this.add.ellipse(b.x, b.y + 73, 181, 32, 0x4b6e2c, 0.2);
        this.drop = this.add
          .rectangle(b.x, b.y, b.width, b.height, 0xffe49b, 0)
          .setDepth(1);
        this.basket = this.art(b.x, b.y, '05/basket_empty', 180, 160).setDepth(
          2,
        );
        this.add
          .text(b.x, b.y + 97, 'Thả vào giỏ', {
            fontFamily: 'Nunito',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#355d38',
            backgroundColor: '#fff8d9',
            padding: { x: 13, y: 6 },
          })
          .setOrigin(0.5)
          .setDepth(2);
      }
      if (this.run.config.skill === 'wheel') this.createWheel();
      else
        for (const target of this.run.targets) {
          const container = this.add.container(target.x, target.y).setDepth(3);
          const halo = this.add
            .circle(0, 0, target.size * 0.56, 0xfffbd3, 0.12)
            .setStrokeStyle(3, 0xffdd72);
          this.halos.push(halo);
          container.add(halo);
          const skill = this.run.config.skill;
          const key =
            skill === 'left'
              ? ['06/balloon_red', '06/balloon_cyan', '06/balloon_yellow'][
                  target.id % 3
                ]!
              : skill === 'drag'
                ? '05/star_gold_large'
                : skill === 'middle'
                  ? '06/crate_wood'
                  : '06/treasure_chest_closed';
          const sprite = this.art(
            0,
            0,
            key,
            target.size,
            skill === 'left' ? target.size * 1.6 : target.size,
          );
          if (skill === 'left') sprite.setOrigin(0.5, 0.33);
          container.add(sprite);
          if (skill === 'middle') {
            sprite.setTint(0xc7baf8);
            container.add(this.art(0, 0, '06/padlock_gold', target.size * 0.4));
          }
          const label = this.add
            .text(
              0,
              target.size * 0.7,
              `${skill === 'middle' ? 'Cổng ' : ''}${target.id + 1}`,
              {
                fontFamily: 'Nunito',
                fontSize: '20px',
                color: '#263858',
                fontStyle: 'bold',
                stroke: '#fffdf7',
                strokeThickness: 5,
              },
            )
            .setOrigin(0.5);
          label.setVisible(skill !== 'drag');
          container.add(label);
          this.objects.push(container);
        }
      this.menuLayer = this.add.container(0, 0).setDepth(50);
      const canvas = this.game.canvas;
      const cursorCanvas = document.createElement('canvas');
      cursorCanvas.width = 36;
      cursorCanvas.height = 36;
      cursorCanvas
        .getContext('2d')
        ?.drawImage(
          this.textures
            .get('04/cursor_arrow')
            .getSourceImage() as HTMLImageElement,
          0,
          0,
          36,
          36,
        );
      canvas.style.cursor = `url("${cursorCanvas.toDataURL()}") 2 2, crosshair`;
      canvas.style.touchAction = 'none';
      const listen = <K extends keyof HTMLElementEventMap>(
        type: K,
        callback: (event: HTMLElementEventMap[K]) => void,
      ) => {
        canvas.addEventListener(type, callback, { passive: false });
        this.cleanup.push(() => canvas.removeEventListener(type, callback));
      };
      const point = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: ((e.clientX - rect.left) * 960) / rect.width,
          y: ((e.clientY - rect.top) * 560) / rect.height,
        };
      };
      listen('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || this.paused || this.ended) return;
        if (e.button === 1 && this.run.config.skill === 'middle')
          e.preventDefault();
        this.pointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        this.accept({
          ...point(e),
          type: 'down',
          button: e.button,
          t: options.elapsed(),
        });
      });
      listen('pointermove', (e) => {
        if (
          this.pointerId !== e.pointerId ||
          performance.now() - this.lastMove < 25
        )
          return;
        this.lastMove = performance.now();
        this.accept({
          ...point(e),
          type: 'move',
          button: -1,
          t: options.elapsed(),
        });
      });
      listen('pointerup', (e) => {
        if (this.pointerId !== e.pointerId) return;
        this.accept({
          ...point(e),
          type: 'up',
          button: e.button,
          t: options.elapsed(),
        });
        this.pointerId = null;
        if (canvas.hasPointerCapture(e.pointerId))
          canvas.releasePointerCapture(e.pointerId);
      });
      listen('pointercancel', () => this.cancel());
      listen('lostpointercapture', () => {
        if (this.pointerId !== null) this.cancel();
      });
      listen('contextmenu', (e) => {
        if (this.run.config.skill === 'right') e.preventDefault();
      });
      listen('mousedown', (e) => {
        if (e.button === 1 && this.run.config.skill === 'middle')
          e.preventDefault();
      });
      listen('auxclick', (e) => {
        if (e.button === 1 && this.run.config.skill === 'middle')
          e.preventDefault();
      });
      listen('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 560 : 1;
        this.accept({
          ...point(e),
          type: 'wheel',
          button: -1,
          deltaY: Math.max(-10000, Math.min(10000, e.deltaY * factor)),
          t: options.elapsed(),
        });
      });
      this.events.once('shutdown', () => {
        this.cleanup.forEach((f) => f());
        this.cleanup = [];
      });
      options.onUpdate(this.run);
      resolveReady();
    }
    // Origin is assigned before loading: timestamps correspond to the server ticket, not scene boot.
    private accept(event: MouseInput) {
      if (this.paused || this.ended || !this.ready) return;
      if (this.inputLog.length >= 5990) {
        this.ended = true;
        options.onError(
          'Lượt luyện đã có nhiều thao tác. Em hãy chơi lại để luyện chậm và chính xác hơn.',
        );
        return;
      }
      const before = this.run.completedTargets;
      this.inputLog.push(event);
      this.run.input(event);
      if (this.run.completedTargets > before) {
        options.onSuccess();
        this.celebrate(event.x, event.y);
        if (this.basket) this.basket.setTexture('05/basket_stars');
      }
      if (event.type !== 'move') options.onUpdate(this.run);
      this.drawMenu();
      this.paint();
      if (this.run.complete) {
        this.ended = true;
        options.onComplete([...this.inputLog]);
      }
    }
    private cancel() {
      this.pointerId = null;
      if (!this.paused && !this.ended && this.ready)
        this.inputLog.push({
          type: 'cancel',
          button: -1,
          x: 0,
          y: 0,
          t: options.elapsed(),
        });
      this.run.cancel();
      this.drawMenu();
      this.paint();
    }
    setPaused(value: boolean) {
      if (value) this.cancel();
      this.paused = value;
    }
    private drawMenu() {
      this.menuLayer?.removeAll(true);
      if (!this.menuLayer || !this.run.menu) return;
      menuRects(this.run.menu).forEach((r, i) => {
        const box = this.add
          .rectangle(r.x, r.y, r.width, r.height, 0xfffdf7)
          .setOrigin(0)
          .setStrokeStyle(2, 0x7fb9a9);
        const text = this.add.text(
          r.x + 14,
          r.y + 13,
          ['Mở rương', 'Xem vật phẩm'][i]!,
          {
            fontFamily: 'Nunito',
            fontSize: '21px',
            fontStyle: 'bold',
            color: '#263858',
          },
        );
        this.menuLayer!.add([box, text]);
      });
    }
    private createWheel() {
      this.add
        .rectangle(480, 285, 450, 490, 0xfffdf7, 0.94)
        .setStrokeStyle(4, 0xa8d9c2);
      this.wheelLayer = this.add.container(0, 0).setDepth(3);
      const mask = this.make.graphics({ x: 0, y: 0 });
      mask.fillRect(260, 50, 440, 470);
      this.wheelLayer.setMask(mask.createGeometryMask());
      wheelItems.forEach((item, i) => {
        const y = 280 + i * 240;
        this.wheelLayer!.add(this.art(480, y, `06/${item.sprite}`, 140));
        this.wheelLayer!.add(
          this.add
            .text(480, y + 90, item.name, {
              fontFamily: 'Nunito',
              fontSize: '24px',
              fontStyle: 'bold',
              color: '#263858',
            })
            .setOrigin(0.5),
        );
      });
      this.add.rectangle(720, 280, 12, 450, 0x8cbfa4).setDepth(4);
    }
    private paint() {
      if (!this.ready) return;
      const t = options.elapsed();
      this.objects.forEach((object, i) => {
        const target = this.run.targets[i]!;
        const pos = this.run.position(target, t);
        object.setPosition(pos.x, pos.y);
        this.halos[i]!.setVisible(
          (!target.done &&
            (i === this.run.activeTarget ||
              this.run.config.skill === 'drag')) ||
            (target.done && this.run.config.skill === 'middle'),
        );
        if (target.done && this.run.config.skill === 'middle')
          this.halos[i]!.setFillStyle(0xffe49b, 0.8).setStrokeStyle(
            4,
            0xffffff,
          );
        if (target.done) {
          if (
            this.run.config.skill === 'drag' ||
            this.run.config.skill === 'left'
          )
            object.setVisible(false);
          else {
            const sprite = object.list[1] as PhaserType.GameObjects.Image;
            sprite.setTexture(
              this.run.config.skill === 'middle'
                ? '06/key_gold'
                : '06/treasure_chest_open',
            );
            object.setAlpha(this.run.config.skill === 'middle' ? 1 : 0.75);
            if (this.run.config.skill === 'middle')
              (object.list[2] as PhaserType.GameObjects.Image).setVisible(
                false,
              );
          }
        }
      });
      this.drop?.setFillStyle(
        insideDrop(this.run.dragging ?? { x: 0, y: 0 }) ? 0xffe49b : 0xa8e6cf,
        insideDrop(this.run.dragging ?? { x: 0, y: 0 }) ? 0.3 : 0,
      );
      this.wheelLayer?.setY(-this.run.scroll);
    }
    private celebrate(x: number, y: number) {
      const star = this.art(x, y, '12/star_gold', 44).setDepth(100);
      if (this.reduced) {
        this.time.delayedCall(200, () => star.destroy());
        return;
      }
      this.tweens.add({
        targets: star,
        y: y - 70,
        alpha: 0,
        angle: 35,
        duration: 600,
        onComplete: () => star.destroy(),
      });
    }
    update() {
      if (!this.paused && !this.ended) this.paint();
    }
  })('MouseGarden');
}
