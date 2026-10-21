import { test, expect } from '@playwright/test';

for (const [module, lesson, css] of [
  ['keyboard', 'keyboard-home-both', '.typing-page'],
  ['vietnamese', 'vietnamese-sentence', '.typing-page'],
  ['files', 'files-organize', '.simulation-page'],
  ['computer', 'computer-launch', '.simulation-page'],
  ['safety', 'safety-password', '.simulation-page'],
])
  test(`${module}: practice uses the actual viewport and native fullscreen`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.goto(`/play/${module}/practice/${lesson}`);
    for (const [width, height] of [
      [1366, 768],
      [1440, 1000],
      [2560, 1080],
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      await expect
        .poll(async () => {
          const b = (await page.locator(css!).boundingBox())!;
          return Math.abs(b.width - width!) + Math.abs(b.height - height!);
        })
        .toBeLessThan(1);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page
      .getByRole('button', { name: 'Toàn màn hình', exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    await page
      .getByRole('button', { name: 'Thoát toàn màn hình', exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
    await page
      .getByRole('button', { name: /^Bắt đầu (luyện tập|thực hành)$/ })
      .click();
    if (module === 'computer')
      await page
        .getByRole('button', { name: 'Mở Ghi chú của em', exact: true })
        .dblclick();
    if (module === 'keyboard')
      await expect(page.locator('.keyboard-studio')).toBeFocused();
    else
      await expect(
        page.getByRole('button', { name: 'Nộp bài', exact: true }),
      ).toBeVisible();
    await expect(page.locator('[aria-label="Đang tải hình"]')).toHaveCount(0);
    if (module === 'computer') {
      await expect(page.locator('[data-window="notes"]')).toBeVisible();
      const surface = (await page.locator('.desktop-scroll').boundingBox())!;
      const world = (await page.locator('.desktop-world').boundingBox())!;
      expect(world.height).toBeGreaterThan(surface.height * 0.85);
      expect(world.width).toBeLessThanOrEqual(surface.width + 1);
    }
    await page.screenshot({
      path: `.local/practice-fit-${info.project.name}-${module}-1366.png`,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `.local/practice-fit-${info.project.name}-${module}-390.png`,
    });
  });
