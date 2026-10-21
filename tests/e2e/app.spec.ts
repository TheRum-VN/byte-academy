import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';
test('student routes use real assets, responsive layout and honest availability', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(
    page.getByRole('heading', { name: 'Xin chào, nhà thám hiểm nhỏ!' }),
  ).toBeVisible();
  await expect(page.locator('.module-art')).toHaveCount(4);
  await page.locator('.module-art').first().waitFor();
  for (const image of await page.locator('img.module-art').all())
    expect(
      await image.evaluate((node: HTMLImageElement) => node.naturalWidth),
    ).toBeGreaterThan(0);
  await page.screenshot({ path: '.local/student-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Lớp học', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: /HÀNH TRÌNH 01/ }).click();
  await expect(
    page.getByRole('button', { name: 'Xem bài học' }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/play');
  await expect(
    page.getByRole('heading', { name: 'Chọn hành trình của em' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '.local/student-mobile.png', fullPage: true });
});
test('teacher login, persisted room, student join and live Socket.IO member update', async ({
  page,
  browser,
}) => {
  await page.goto('/admin/rooms');
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel('Tên đăng nhập').fill('e2e-teacher');
  await page
    .getByLabel('Mật khẩu', { exact: true })
    .fill('e2e-only-passphrase');
  await page.getByRole('button', { name: 'Vào không gian giáo viên' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Lớp học', exact: true }).click();
  await page.getByLabel('Tên lớp').fill('Lớp kiểm thử');
  await page.getByRole('button', { name: 'Tạo lớp' }).click();
  await expect(
    page.getByRole('heading', { name: 'Lớp kiểm thử' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Phòng học', exact: true }).click();
  await page.getByLabel('Tên phòng').fill('Phòng thử realtime');
  await page.getByRole('button', { name: 'Tạo phòng học' }).click();
  const code = (await page.locator('.room-code').first().innerText()).trim();
  await expect(page.getByText('Đã kết nối trực tiếp')).toBeVisible();
  const context = await browser.newContext();
  const student = await context.newPage();
  await student.goto('/play');
  await student.getByRole('button', { name: 'Tham gia phòng học' }).click();
  await student.getByLabel('Mã phòng').fill(code);
  await student.getByLabel('Tên của em').fill('Học sinh kiểm thử');
  await student.getByRole('button', { name: 'Vào phòng học' }).click();
  await expect(student.getByText('Đã kết nối trực tiếp')).toBeVisible();
  await expect(page.getByText('1 học sinh đã tham gia')).toBeVisible();
  await student.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(
    student.getByRole('button', { name: 'Hồ sơ học sinh' }),
  ).toContainText('Học sinh kiểm thử');
  await student.reload();
  await expect(
    student.getByRole('button', { name: 'Hồ sơ học sinh' }),
  ).toContainText('Học sinh kiểm thử');
  await student.getByRole('button', { name: 'Lớp học', exact: true }).click();
  await expect(student.getByText('Đã kết nối trực tiếp')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 học sinh đã tham gia')).toBeVisible();
  expect(
    (
      await student.request.post(`/api/rooms/${code}/state`, {
        data: { state: 'FINISHED', revision: 0 },
      })
    ).status(),
  ).toBe(401);
  const anonymous = io('http://127.0.0.1:3101', {
    transports: ['websocket'],
    forceNew: true,
  });
  try {
    const denied = await new Promise<{ ok: boolean }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket timeout')), 5000);
      anonymous.on('connect', () => {
        anonymous.emit(
          'room:subscribe',
          { code },
          (result: { ok: boolean }) => {
            clearTimeout(timer);
            resolve(result);
          },
        );
      });
    });
    expect(denied.ok).toBe(false);
  } finally {
    anonymous.disconnect();
  }
  expect(
    (
      await page.request.post(`/api/rooms/${code}/state`, {
        data: { state: 'FINISHED', revision: 0 },
      })
    ).status(),
  ).toBe(200);
  await expect(student.getByText('Đã kết thúc', { exact: true })).toBeVisible();
  await context.close();
  await page.screenshot({ path: '.local/admin-rooms.png', fullPage: true });
});
test('production blocks dev asset route and private files', async ({
  request,
}) => {
  expect((await request.get('/dev/assets')).status()).toBe(404);
  expect((await request.get('/assets/no-such-image.png')).status()).toBe(404);
  expect((await request.get('/api/classes')).status()).toBe(401);
  const response = await request.get('/prisma/byte.db');
  expect(response.headers()['content-type']).not.toContain(
    'application/octet-stream',
  );
});
