import { test, expect } from '@playwright/test';

test('stage fits the entire viewport after resize and native fullscreen', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/play/mouse/practice/mouse-drag-1');
  const stage = page.locator('.mouse-stage');
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [1440, 1000],
    [2560, 1080],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect
      .poll(async () => {
        const box = await stage.boundingBox();
        return Math.abs(box!.height - height!);
      })
      .toBeLessThan(1);
    await expect
      .poll(async () => {
        const b = await stage.boundingBox();
        return Math.abs(b!.width - width!);
      })
      .toBeLessThan(1);
    const box = (await stage.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(width! + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(height! + 1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page
    .getByRole('button', { name: 'Toàn màn hình', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.className))
    .toBe('mouse-game-page');
  await page
    .getByRole('button', { name: 'Thoát toàn màn hình', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await page.screenshot({
    path: `.local/mouse-redesign-${info.project.name}-ready-1920.png`,
  });
});

test('all six skills use the immersive garden, keep canvas coordinates, and load real artwork', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const skill of ['left', 'right', 'double', 'drag', 'middle', 'wheel']) {
    await page.goto(`/play/mouse/practice/mouse-${skill}-1`);
    await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Tạm dừng', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`0/${skill === 'drag' ? 5 : 3} mục tiêu`, { exact: true }),
    ).toBeVisible();
    const canvas = (await page.locator('canvas').boundingBox())!;
    expect(canvas.width / canvas.height).toBeCloseTo(960 / 560, 3);
    const area = (await page.locator('.mouse-canvas-scroll').boundingBox())!;
    expect(canvas.width).toBeLessThanOrEqual(area.width + 1);
    expect(canvas.height).toBeLessThanOrEqual(area.height + 1);
    for (const img of await page.locator('.mouse-stage img').all()) {
      await expect(img).toBeVisible();
      expect(
        await img.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: `.local/mouse-redesign-${info.project.name}-${skill}-1920.png`,
    });
    if (skill === 'drag') {
      for (const [width, height] of [
        [1366, 768],
        [390, 844],
        [844, 390],
      ]) {
        await page.setViewportSize({ width: width!, height: height! });
        await page.screenshot({
          path: `.local/mouse-redesign-${info.project.name}-drag-${width}.png`,
        });
      }
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
  }
  expect(errors).toEqual([]);
});
