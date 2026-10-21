import { test, expect } from '@playwright/test';
import { lessons } from '@byte/shared';

test('student world fits target screens, loads sprites and has no runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.url().includes('/assets/') && response.status() >= 400)
      errors.push(response.url());
  });
  for (const [width, height] of [
    [1366, 768],
    [1600, 900],
    [1920, 1080],
    [2560, 1440],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto('/play');
    await expect(page.locator('img.module-art')).toHaveCount(4);
    await expect(
      page.getByRole('progressbar', { name: /Tiến độ Vương quốc/ }),
    ).toHaveAttribute('value', '0');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[aria-label="Đang tải hình"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const image of await page.locator('img').all())
      expect(
        await image.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      ).toBe(true);
    if (width! >= 1366) {
      const banner = await page.locator('.welcome-banner').boundingBox();
      const robot = await page.locator('.hero-byte').boundingBox();
      expect(robot!.y).toBeGreaterThanOrEqual(banner!.y);
      expect(robot!.y + robot!.height).toBeLessThanOrEqual(
        banner!.y + banner!.height,
      );
      for (const cta of await page.locator('.module-cta').all()) {
        const box = await cta.boundingBox();
        expect(box!.y + box!.height).toBeLessThan(height!);
      }
    }
    await page.screenshot({
      path: `.local/m02-home-${width}x${height}.png`,
      fullPage: true,
    });
  }
  for (const module of [
    'mouse',
    'keyboard',
    'files',
    'vietnamese',
    'computer',
    'safety',
  ]) {
    await page.goto(`/play/${module}`);
    await expect(
      page.getByRole('button', { name: 'Xem bài học' }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Lớp 1–2', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Lớp 1–2', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  await page.goto('/play');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero-byte')).toHaveCSS('animation-name', 'none');
});

test('navigation, instruction preview, focus, settings and daily missions work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/play');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const settings = page.getByRole('dialog');
  await expect(settings).toBeVisible();
  await settings.getByRole('slider').fill('0.35');
  await expect(settings.getByText('Âm lượng: 35%')).toBeVisible();
  await settings
    .getByRole('button', { name: 'Bật âm thanh', exact: true })
    .click();
  await expect(
    settings.getByRole('button', { name: 'Tắt âm thanh', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Cài đặt', exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Tắt âm thanh', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hồ sơ học sinh' }).click();
  await expect(
    page.getByRole('dialog').getByText('Chào mừng em!'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('navigation', { name: 'Điều hướng học sinh' })
    .getByRole('link', { name: 'Nhiệm vụ', exact: true })
    .click();
  await expect(page).toHaveURL(/play\/missions/);
  await expect(page.locator('.mission-row')).toHaveCount(3);
  await page.locator('.mission-row').first().click();
  const preview = page.getByRole('dialog');
  await expect(
    preview.getByRole('button', { name: 'Vào bài học', exact: true }),
  ).toBeEnabled();
  await expect(
    preview.getByText(
      lessons.find((l) => l.id === 'mouse-left-1')!.instructions[0]!,
      { exact: true },
    ),
  ).toBeVisible();
  await preview.getByRole('button', { name: 'Nghe hướng dẫn' }).click();
  await expect(preview.getByText('Chưa có lượt chơi')).toBeVisible();
  await page.screenshot({
    path: '.local/m02-lesson-preview-1366.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Xem bài học' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Quay lại' })
    .click();
  await page.getByRole('link', { name: 'Về bản đồ khám phá' }).click();
  await page.getByRole('link', { name: 'Thành tích: 0 sao' }).click();
  await expect(
    page.getByRole('heading', { name: 'Bộ sưu tập của em' }),
  ).toBeVisible();
  await expect(page.locator('.achievement-card')).toHaveCount(
    lessons.filter((l) => !l.config.retired).length,
  );
  await page
    .getByRole('navigation', { name: 'Điều hướng học sinh' })
    .getByRole('link', { name: 'Khám phá', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Thế giới nhỏ, khám phá lớn' }),
  ).toBeVisible();
  await page.goto('/play/mouse');
  await expect(page.locator('[aria-label="Đang tải hình"]')).toHaveCount(0);
  await expect(
    page.getByText('Hình ảnh sẵn sàng cho hành trình của em.'),
  ).toBeVisible();
  await page.screenshot({ path: '.local/m02-module-1366.png', fullPage: true });
});

test('failed data fetch recovers without displaying made up progress', async ({
  page,
}) => {
  await page.route('**/api/student/overview', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Offline' }),
    }),
  );
  await page.goto('/play');
  await expect(page.getByRole('alert')).toContainText('Chưa kết nối');
  await expect(page.locator('.card-progress progress')).toHaveCount(0);
  await page.unroute('**/api/student/overview');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.card-progress progress')).toHaveCount(4);
});
