import { test, expect, type Page } from '@playwright/test';
import {
  MouseRun,
  mouseConfig,
  mouseLessons,
  menuRects,
  type MouseAttemptTicket,
} from '@byte/shared';
async function start(page: Page, id: string) {
  await page.goto(`/play/mouse/practice/${id}`);
  await expect(
    page.getByRole('button', { name: 'Bắt đầu luyện tập' }),
  ).toBeEnabled();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/attempts') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  const ticket = (await (await response).json()) as MouseAttemptTicket;
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tạm dừng', exact: true }),
  ).toBeVisible();
  return ticket;
}
async function at(page: Page, x: number, y: number) {
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = await page.locator('canvas').boundingBox();
  return {
    x: box!.x + (x * box!.width) / 960,
    y: box!.y + (y * box!.height) / 560,
  };
}
async function click(
  page: Page,
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle' = 'left',
) {
  const pos = await at(page, x, y);
  await page.mouse.click(pos.x, pos.y, { button, delay: 60 });
}
for (const lesson of mouseLessons)
  test(`${lesson.id}: complete with physical browser events and persist`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const ticket = await start(page, lesson.id);
    const run = new MouseRun(mouseConfig(lesson), ticket.seed);
    if (run.config.skill === 'wheel') {
      await page.locator('canvas').scrollIntoViewIfNeeded();
      const pos = await at(page, 480, 280);
      await page.mouse.move(pos.x, pos.y);
      for (const [count, delta] of [
        [10, 120],
        [10, -120],
        [run.config.level === 1 ? 6 : 8, 120],
      ])
        for (let i = 0; i < count!; i++) {
          await page.mouse.wheel(0, delta!);
          await page.waitForTimeout(35);
        }
    } else
      for (const target of run.targets) {
        if (run.config.skill === 'left') {
          // Slow movement stays within the large hitbox around the starting center.
          await click(page, target.x, target.y);
        } else if (run.config.skill === 'right') {
          await click(page, target.x, target.y, 'right');
          const rect = menuRects(target)[run.config.level === 1 ? 0 : 1]!;
          await click(page, rect.x + 35, rect.y + 25);
        } else if (run.config.skill === 'double') {
          const pos = await at(page, target.x, target.y);
          await page.mouse.dblclick(pos.x, pos.y, { delay: 80 });
        } else if (run.config.skill === 'drag') {
          const pos = await at(page, target.x + 8, target.y + 8);
          const drop = await at(page, 813, 433);
          await page.mouse.move(pos.x, pos.y);
          await page.mouse.down();
          await page.mouse.move(drop.x, drop.y, { steps: 8 });
          await page.mouse.up();
        } else await click(page, target.x, target.y, 'middle');
      }
    const result = page.getByRole('dialog', { name: 'Kết quả luyện tập' });
    await expect(result).toBeVisible();
    await expect(result.getByText('Đạt · Kết quả đã lưu')).toBeVisible();
    await expect(
      result.getByText('Độ chính xác: 100%', { exact: false }),
    ).toBeVisible();
    const overview = await (
      await page.request.get('/api/student/overview')
    ).json();
    expect(
      overview.progress.some(
        (p: { lessonId: string }) => p.lessonId === lesson.id,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/m03-${lesson.id}-result.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test('wrong buttons, double-click timing, pause/resume, menu scope, and level navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  const ticket = await start(page, 'mouse-double-1');
  const run = new MouseRun(
    mouseConfig(mouseLessons.find((l) => l.id === 'mouse-double-1')!),
    ticket.seed,
  );
  const target = run.targets[0]!;
  await click(page, target.x, target.y, 'right');
  await click(page, target.x, target.y, 'middle');
  await click(page, target.x, target.y);
  await page.waitForTimeout(750);
  await click(page, target.x, target.y);
  await expect(page.getByText('0/3 mục tiêu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Nghỉ một chút nhé!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const target of run.targets) {
    const pos = await at(page, target.x, target.y);
    await page.mouse.dblclick(pos.x, pos.y, { delay: 70 });
  }
  await expect(
    page.getByRole('dialog', { name: 'Kết quả luyện tập' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Bài tiếp theo', exact: true })
    .click();
  await expect(page).toHaveURL(/mouse-double-2/);
  await expect(page.getByRole('combobox', { name: 'Chọn cấp độ' })).toHaveValue(
    '2',
  );
  await page.getByRole('combobox', { name: 'Chọn cấp độ' }).selectOption('1');
  await expect(page).toHaveURL(/mouse-double-1/);
});
test('drag returns on a missed drop, handles pointercancel, captures fast movement; desktop/mobile layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await start(page, 'mouse-drag-1');
  const origin = await at(page, 123, 178);
  const miss = await at(page, 500, 500);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(miss.x, miss.y);
  await page.mouse.up();
  await expect(page.getByText('0/5 mục tiêu', { exact: true })).toBeVisible();
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(miss.x, miss.y);
  await page
    .locator('canvas')
    .dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  const outside = await at(page, -80, 100);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y);
  await page.mouse.up();
  await expect(page.getByText('0/5 mục tiêu', { exact: true })).toBeVisible();
  const drop = await at(page, 813, 433);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y);
  await page.mouse.up();
  await expect(page.getByText('1/5 mục tiêu', { exact: true })).toBeVisible();
  await page.screenshot({
    path: '.local/m03-garden-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '.local/m03-garden-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('teacher and student contexts: assigned lesson, real pause/resume, finish and saved report', async ({
  browser,
}) => {
  const teacherContext = await browser.newContext();
  const teacher = await teacherContext.newPage();
  await teacher.goto('/admin/login');
  await teacher.getByLabel('Tên đăng nhập').fill('e2e-teacher');
  await teacher
    .getByLabel('Mật khẩu', { exact: true })
    .fill('e2e-only-passphrase');
  await teacher
    .getByRole('button', { name: 'Vào không gian giáo viên' })
    .click();
  await expect(teacher).toHaveURL(/\/admin$/);
  await teacher.goto('/admin/rooms');
  await teacher.getByLabel('Tên phòng').fill('Mouse M03 room');
  await teacher.locator('select[name=lessonId]').selectOption('mouse-drag-1');
  await teacher.getByRole('button', { name: 'Tạo phòng học' }).click();
  const panel = teacher.locator('.room-panel').first();
  await expect(panel.getByText('Đã kết nối trực tiếp')).toBeVisible();
  const code = (await panel.locator('.room-code').innerText()).trim();
  const studentContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const student = await studentContext.newPage();
  await student.goto('/play');
  await student.getByRole('button', { name: 'Tham gia phòng học' }).click();
  await student.getByLabel('Mã phòng').fill(code);
  await student.getByLabel('Tên của em').fill('Bạn Chuột M03');
  await student
    .getByRole('button', { name: 'Vào phòng học', exact: true })
    .click();
  await student.getByRole('link', { name: 'Vào bài luyện chuột' }).click();
  await expect(student).toHaveURL(/mouse-drag-1/);
  await expect(
    student.getByRole('button', { name: 'Chờ thầy cô bắt đầu' }),
  ).toBeDisabled();
  await panel.getByRole('button', { name: 'Sẵn sàng', exact: true }).click();
  await panel.getByRole('button', { name: 'Chuẩn bị', exact: true }).click();
  await panel
    .getByRole('button', { name: 'Bắt đầu bài học', exact: true })
    .click();
  await student.bringToFront();
  await expect(
    student.getByRole('button', { name: 'Bắt đầu luyện tập' }),
  ).toBeEnabled();
  const response = student.waitForResponse(
    (r) => r.url().endsWith('/api/attempts') && r.request().method() === 'POST',
  );
  await student.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await response;
  await expect(student.locator('canvas')).toBeVisible();
  await expect(
    student.getByRole('combobox', { name: 'Chọn cấp độ' }),
  ).toBeDisabled();
  const origin = await at(student, 123, 178);
  const drop = await at(student, 813, 433);
  await student.mouse.move(origin.x, origin.y);
  await student.mouse.down();
  await student.mouse.move(drop.x, drop.y);
  await student.mouse.up();
  await expect(
    student.getByText('1/5 mục tiêu', { exact: true }),
  ).toBeVisible();
  // Keep student window focus: teacher controls run over its authenticated HTTP channel.
  expect(
    (
      await teacher.request.post(`/api/rooms/${code}/state`, {
        data: { state: 'PAUSED', revision: 3 },
      })
    ).ok(),
  ).toBe(true);
  await expect(
    student.getByRole('dialog', { name: 'Chờ thầy cô một chút nhé!' }),
  ).toBeVisible();
  await student.keyboard.press('Escape');
  await expect(
    student.getByRole('dialog', { name: 'Chờ thầy cô một chút nhé!' }),
  ).toBeVisible();
  await student.screenshot({
    path: '.local/m03-room-paused.png',
    fullPage: true,
  });
  expect(
    (
      await teacher.request.post(`/api/rooms/${code}/state`, {
        data: { state: 'PLAYING', revision: 4 },
      })
    ).ok(),
  ).toBe(true);
  await expect(student.getByRole('dialog')).toHaveCount(0);
  for (let id = 1; id < 5; id++) {
    const from = await at(
      student,
      115 + (id % 3) * 210 + 8,
      170 + Math.floor(id / 3) * 130 + 8,
    );
    await student.mouse.move(from.x, from.y);
    await student.mouse.down();
    await student.mouse.move(drop.x, drop.y, { steps: 5 });
    await student.mouse.up();
  }
  await expect(
    student.getByRole('dialog', { name: 'Kết quả luyện tập' }),
  ).toBeVisible();
  await expect(student.getByText('Đạt · Kết quả đã lưu')).toBeVisible();
  const reports = await (await teacher.request.get('/api/reports')).json();
  expect(
    reports.some(
      (r: { attempt: { student: { name: string } }; passed: boolean }) =>
        r.attempt.student.name === 'Bạn Chuột M03' && r.passed,
    ),
  ).toBe(true);
  // A new assigned attempt must end as incomplete if the teacher finishes early.
  await student.getByRole('button', { name: 'Chơi lại', exact: true }).click();
  await student.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await expect(
    student.getByRole('button', { name: 'Tạm dừng', exact: true }),
  ).toBeVisible();
  expect(
    (
      await teacher.request.post(`/api/rooms/${code}/state`, {
        data: { state: 'FINISHED', revision: 5 },
      })
    ).ok(),
  ).toBe(true);
  await expect(
    student.getByRole('dialog', { name: 'Kết quả luyện tập' }),
  ).toBeVisible();
  await expect(student.getByText('Chưa đạt · Kết quả đã lưu')).toBeVisible();
  await studentContext.close();
  await teacherContext.close();
});

test('right context menu is scoped, wheel is contained, and failed submission retries once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const ticket = await start(page, 'mouse-right-1');
  expect(
    await page
      .locator('canvas')
      .evaluate(
        (canvas) =>
          !canvas.dispatchEvent(
            new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
          ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator('h1')
      .evaluate((heading) =>
        heading.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(true);
  let calls = 0;
  await page.route(`**/api/attempts/${ticket.id}/result`, (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QA temporary outage' }),
        })
      : route.continue();
  });
  const run = new MouseRun(
    mouseConfig(mouseLessons.find((l) => l.id === 'mouse-right-1')!),
    ticket.seed,
  );
  for (const target of run.targets) {
    await click(page, target.x, target.y, 'right');
    const rect = menuRects(target)[0]!;
    await click(page, rect.x + 35, rect.y + 25);
  }
  await expect(page.getByRole('alert')).toContainText('QA temporary outage');
  await page.getByRole('button', { name: 'Thử lưu lại kết quả' }).click();
  await expect(page.getByText('Đạt · Kết quả đã lưu')).toBeVisible();
  expect(calls).toBe(2);
  const overview = await (
    await page.request.get('/api/student/overview')
  ).json();
  expect(overview.progress[0].completedCount).toBe(1);
  await page.goto('/play/mouse/practice/mouse-wheel-1');
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const pos = await at(page, 480, 280);
  await page.mouse.move(pos.x, pos.y);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test('missing garden asset prevents gameplay and reports the actual loading failure', async ({
  page,
}) => {
  await page.route('**/atlas_05_mouse_garden/13_basket_empty.png', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto('/play/mouse/practice/mouse-drag-1');
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await expect(page.getByRole('alert')).toContainText('Không tải đủ hình ảnh');
  await expect(
    page.getByRole('button', { name: 'Tạm dừng', exact: true }),
  ).toHaveCount(0);
});
