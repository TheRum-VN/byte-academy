import { test, expect, type Page } from '@playwright/test';
import {
  fileLessons,
  computerLessons,
  safetyLessons,
  simulationDefinition,
  type Lesson,
} from '@byte/shared';
async function start(page: Page, id: string) {
  const module = id.split('-')[0];
  await page.goto(`/play/${module}/practice/${id}`);
  const started = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/simulation/attempts') &&
      r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Bắt đầu thực hành', exact: true })
    .click();
  const ticket = await (await started).json();
  if (ticket.paused)
    await page
      .getByRole('dialog', { name: 'Nghỉ một chút nhé!' })
      .getByRole('button', { name: 'Tiếp tục', exact: true })
      .click();
  await expect(
    page.getByRole('button', { name: 'Nộp bài', exact: true }),
  ).toBeEnabled();
}
async function act(page: Page, operation: () => Promise<unknown>) {
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('/api/simulation/attempts/') &&
      r.url().endsWith('/action') &&
      r.request().method() === 'POST',
  );
  await operation();
  const r = await response;
  expect(r.status(), await r.text()).toBe(200);
  await expect(
    page.getByRole('button', { name: 'Nộp bài', exact: true }),
  ).toBeEnabled();
  return r.json();
}
function file(page: Page, id: string) {
  return page.locator(`.file-grid [data-nodeid="${id}"]`);
}
async function create(page: Page, name: string) {
  await page
    .locator('.explorer-toolbar')
    .getByRole('button', { name: 'Thư mục mới', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Tên thư mục mới', { exact: true })
    .fill(name);
  return act(page, () =>
    page.getByRole('button', { name: 'Lưu tên', exact: true }).click(),
  );
}
async function rename(page: Page, id: string, name: string) {
  await file(page, id).click();
  await page
    .locator('.explorer-toolbar')
    .getByRole('button', { name: 'Đổi tên', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Tên mới', { exact: true })
    .fill(name);
  await act(page, () =>
    page.getByRole('button', { name: 'Lưu tên', exact: true }).click(),
  );
}
async function move(page: Page, id: string, destination: string) {
  await file(page, id).click();
  await page
    .locator('.explorer-toolbar')
    .getByRole('button', { name: 'Di chuyển', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Thư mục đích')
    .selectOption(destination);
  await act(page, () =>
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Di chuyển', exact: true })
      .click(),
  );
}
async function submit(page: Page, pass = true) {
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Kết quả thực hành' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(`${pass ? 'Đạt' : 'Chưa đạt'} · Kết quả đã lưu`, {
      exact: true,
    }),
  ).toBeVisible();
}
async function completeFiles(page: Page, l: Lesson) {
  const number = simulationDefinition(l).number;
  if (number === 1) {
    await act(page, () => file(page, 'study').dblclick());
    await act(page, () => file(page, 'images').dblclick());
  } else if (number === 2) await create(page, 'Bài tập');
  else if (number === 3) await rename(page, 'draft', 'Vở của em');
  else if (number === 4) {
    await move(page, 'flower', 'images');
    await move(page, 'cat', 'images');
  } else if (number === 5) await move(page, 'movie', 'videos');
  else if (number === 6) {
    for (const goal of simulationDefinition(l).goals)
      if (goal.test.kind === 'parent')
        await move(page, goal.test.id, goal.test.parentId!);
  } else if (number === 7) {
    await file(page, 'flower').click();
    await act(page, () =>
      page
        .locator('.explorer-toolbar')
        .getByRole('button', { name: 'Sao chép', exact: true })
        .click(),
    );
    await act(page, () =>
      page
        .locator('.folder-tree')
        .getByRole('button', { name: 'Hình ảnh', exact: true })
        .click(),
    );
    await act(page, () =>
      page
        .locator('.explorer-toolbar')
        .getByRole('button', { name: 'Dán', exact: true })
        .click(),
    );
  } else if (number === 8)
    await act(page, () => file(page, 'homework').dragTo(file(page, 'docs')));
  else if (number === 9) {
    await file(page, 'song').click();
    await page
      .locator('.explorer-toolbar')
      .getByRole('button', { name: 'Xóa', exact: true })
      .click();
    await act(page, () =>
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Đưa vào thùng rác', exact: true })
        .click(),
    );
    await act(page, () =>
      page
        .locator('.folder-tree')
        .getByRole('button', { name: 'Thùng rác', exact: true })
        .click(),
    );
    await file(page, 'song').click();
    await act(page, () =>
      page
        .locator('.explorer-toolbar')
        .getByRole('button', { name: 'Khôi phục', exact: true })
        .click(),
    );
  } else {
    await create(page, 'Bài tập');
    await rename(page, 'new-1', 'Góc học tập');
    await move(page, 'homework', 'new-1');
    await move(page, 'schedule', 'new-1');
    await move(page, 'flower', 'images');
    await move(page, 'cat', 'images');
  }
}
for (const l of fileLessons)
  test(`${l.id}: explorer operations validate and persist`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await start(page, l.id);
    await completeFiles(page, l);
    await submit(page);
    const overview = await (
      await page.request.get('/api/student/overview')
    ).json();
    expect(
      overview.progress.some((p: { lessonId: string }) => p.lessonId === l.id),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
async function quiz(page: Page, l: Lesson) {
  for (const q of simulationDefinition(l).questions ?? [])
    await act(page, () =>
      page
        .locator('.scenario-choices')
        .getByRole('button', {
          name: q.choices.find((c) => c.correct)!.text,
          exact: false,
        })
        .click(),
    );
}
async function launch(page: Page, id = 'Ghi chú của em') {
  await act(page, () =>
    page.getByRole('button', { name: `Mở ${id}`, exact: true }).dblclick(),
  );
}
async function dragWindow(page: Page, resize = false) {
  const target = resize
    ? page.getByRole('slider', { name: 'Đổi kích thước Ghi chú của em' })
    : page.getByLabel('Thanh tiêu đề Ghi chú của em', { exact: true });
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  const x = resize ? b.x + 10 : b.x + 100,
    y = b.y + 10;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150, y + (resize ? 110 : 45), { steps: 10 });
  await act(page, () => page.mouse.up());
}
for (const l of computerLessons)
  test(`${l.id}: real desktop state`, async ({ page }) => {
    await start(page, l.id);
    const d = simulationDefinition(l);
    if (d.kind === 'quiz') await quiz(page, l);
    else {
      await launch(page);
      switch (d.desktopTask) {
        case 'close':
          await act(page, () =>
            page
              .getByRole('button', { name: 'Đóng Ghi chú của em', exact: true })
              .click(),
          );
          break;
        case 'minimize':
          await act(page, () =>
            page
              .getByRole('button', {
                name: 'Thu nhỏ Ghi chú của em',
                exact: true,
              })
              .click(),
          );
          await expect(page.locator('[data-window="notes"]')).toHaveCount(0);
          await expect(
            page.getByRole('button', {
              name: 'Thanh tác vụ Ghi chú của em',
              exact: true,
            }),
          ).toBeVisible();
          break;
        case 'maximize':
          await act(page, () =>
            page
              .getByRole('button', {
                name: 'Phóng to Ghi chú của em',
                exact: true,
              })
              .click(),
          );
          await expect(page.locator('[data-window="notes"]')).toHaveAttribute(
            'data-status',
            'Maximized',
          );
          break;
        case 'drag':
          await dragWindow(page);
          break;
        case 'resize':
          await dragWindow(page, true);
          break;
        case 'switch':
          await launch(page, 'Album khám phá');
          await page
            .locator('[data-window="notes"]')
            .getByLabel('Thanh tiêu đề Ghi chú của em', { exact: true })
            .scrollIntoViewIfNeeded();
          {
            const h = page.getByLabel('Thanh tiêu đề Ghi chú của em', {
              exact: true,
            });
            const box = (await h.boundingBox())!;
            await act(page, () => page.mouse.click(box.x + 40, box.y + 15));
          }
          await expect(page.locator('[data-window="notes"]')).toHaveAttribute(
            'data-status',
            'Focused',
          );
          break;
        case 'taskbar':
          await act(page, () =>
            page
              .getByRole('button', {
                name: 'Thu nhỏ Ghi chú của em',
                exact: true,
              })
              .click(),
          );
          await act(page, () =>
            page
              .getByRole('button', {
                name: 'Thanh tác vụ Ghi chú của em',
                exact: true,
              })
              .click(),
          );
          break;
      }
    }
    await submit(page);
  });
for (const l of safetyLessons)
  test(`${l.id}: safe scenario requires the correct choice`, async ({
    page,
  }) => {
    await start(page, l.id);
    if (simulationDefinition(l).kind === 'dismiss')
      await act(page, () =>
        page
          .getByRole('button', {
            name: 'Đóng cửa sổ không mong muốn',
            exact: true,
          })
          .click(),
      );
    else await quiz(page, l);
    await submit(page);
  });
test('create/rename/move chain survives reload and cannot pass by clicking submit alone', async ({
  page,
}) => {
  await start(page, 'files-organize');
  await create(page, 'Bài tập');
  await rename(page, 'new-1', 'Góc học tập');
  await move(page, 'homework', 'new-1');
  await page.reload();
  await start(page, 'files-organize');
  await expect(file(page, 'new-1')).toContainText('Góc học tập');
  await expect(file(page, 'homework')).toHaveCount(0);
  await move(page, 'schedule', 'new-1');
  await move(page, 'flower', 'images');
  await move(page, 'cat', 'images');
  await submit(page);
  await start(page, 'files-create');
  await submit(page, false);
});
test('context menu, shortcuts, trash, undo, reset, search, sort, invalid nesting and preview', async ({
  page,
}) => {
  await start(page, 'files-create');
  await create(page, 'Bài tập');
  await file(page, 'new-1').click({ button: 'right' });
  await expect(
    page.getByRole('menu', { name: 'Menu chuột phải' }),
  ).toBeVisible();
  await page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tên mới').fill('Hình ảnh');
  const rejected = page.waitForResponse((r) => r.url().endsWith('/action'));
  await page.getByRole('button', { name: 'Lưu tên', exact: true }).click();
  expect((await rejected).status()).toBe(409);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'đã có',
  );
  await page.getByRole('dialog').getByLabel('Tên mới').fill('Tên riêng');
  await act(page, () =>
    page.getByRole('button', { name: 'Lưu tên', exact: true }).click(),
  );
  await act(page, () =>
    page
      .locator('.explorer-toolbar')
      .getByRole('button', { name: 'Hoàn tác', exact: true })
      .click(),
  );
  await expect(file(page, 'new-1')).toContainText('Bài tập');
  await file(page, 'flower').click();
  await act(page, () => page.keyboard.press('ControlOrMeta+x'));
  await act(page, () =>
    page
      .locator('.folder-tree')
      .getByRole('button', { name: 'Hình ảnh', exact: true })
      .click(),
  );
  await act(page, () => page.keyboard.press('ControlOrMeta+v'));
  await expect(file(page, 'flower')).toBeVisible();
  await act(page, () =>
    page
      .getByRole('navigation', { name: 'Đường dẫn thư mục' })
      .getByRole('button', { name: 'Học tập', exact: true })
      .click(),
  );
  await page.getByLabel('Tìm tệp và thư mục').fill('Hoa');
  await act(page, () =>
    page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click(),
  );
  await expect(file(page, 'flower')).toBeVisible();
  await act(page, () =>
    page.getByRole('button', { name: 'Bỏ tìm kiếm' }).click(),
  );
  await act(page, () => page.getByLabel('Sắp xếp tệp').selectOption('type'));
  await file(page, 'sheet').dblclick();
  await expect(
    page.getByRole('dialog', { name: 'Xem trước mô phỏng' }).getByRole('table'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Đặt lại bài', exact: true }).click();
  await act(page, () =>
    page.getByRole('button', { name: 'Đặt lại bài này', exact: true }).click(),
  );
  await expect(file(page, 'new-1')).toHaveCount(0);
  await expect(file(page, 'flower')).toBeVisible();
  await file(page, 'images').dragTo(
    page.getByRole('link', { name: 'Về phân khu', exact: true }),
  );
  await expect(file(page, 'images')).toBeVisible();
});
test('two contexts: teacher pause/resume/finish and owned persistence', async ({
  browser,
}) => {
  const teacher = await browser.newContext(),
    learner = await browser.newContext();
  try {
    await teacher.request.post('/api/auth/login', {
      data: { username: 'e2e-teacher', password: 'e2e-only-passphrase' },
    });
    const room = await (
      await teacher.request.post('/api/rooms', {
        data: { name: 'Lớp thực hành tệp', lessonId: 'files-create' },
      })
    ).json();
    await learner.request.post('/api/rooms/join', {
      data: { code: room.code, name: 'Bạn sắp xếp' },
    });
    const page = await learner.newPage();
    await page.goto('/play/files/practice/files-create');
    await expect(
      page.getByRole('button', { name: 'Chờ thầy cô bắt đầu' }),
    ).toBeDisabled();
    for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
      await teacher.request.post(`/api/rooms/${room.code}/state`, {
        data: { revision, state },
      });
    await page
      .getByRole('button', { name: 'Bắt đầu thực hành', exact: true })
      .click();
    await create(page, 'Bài tập');
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 3, state: 'PAUSED' },
    });
    await expect(
      page.getByRole('dialog', { name: 'Nghỉ một chút nhé!' }),
    ).toBeVisible();
    await expect(
      page
        .locator('.explorer-toolbar')
        .getByRole('button', { name: 'Thư mục mới', exact: true }),
    ).toBeDisabled();
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 4, state: 'PLAYING' },
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 5, state: 'FINISHED' },
    });
    await expect(
      page.getByText('Đạt · Kết quả đã lưu', { exact: true }),
    ).toBeVisible();
    expect((await teacher.request.get('/api/reports')).ok()).toBe(true);
  } finally {
    await teacher.close();
    await learner.close();
  }
});
test('loaded sprites and desktop/mobile layouts', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1440, 390])
    for (const id of ['files-organize', 'computer-launch', 'safety-password']) {
      await page.setViewportSize({ width, height: 1000 });
      await start(page, id);
      if (
        id === 'computer-launch' &&
        (await page.locator('[data-window="notes"]').count()) === 0
      )
        await launch(page);
      await expect(page.locator('[aria-label="Đang tải hình"]')).toHaveCount(0);
      for (const img of await page.locator('.simulation-page img').all())
        expect(
          await img.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.local/m05-${info.project.name}-${id}-${width}.png`,
        fullPage: true,
      });
    }
  expect(errors).toEqual([]);
});
