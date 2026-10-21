import { test, expect, type Page } from '@playwright/test';
import {
  keyboardLessons,
  vietnameseLessons,
  typingConfig,
  physicalTargets,
} from '@byte/shared';
async function start(page: Page, id: string) {
  const module = id.startsWith('keyboard-') ? 'keyboard' : 'vietnamese';
  await page.goto(`/play/${module}/practice/${id}`);
  await expect(
    page.getByRole('button', { name: 'Bắt đầu luyện tập' }),
  ).toBeVisible();
  if (id === 'vietnamese-name')
    await page.getByLabel('Tên để luyện gõ').fill('Nguyễn An');
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  if (module === 'keyboard')
    await expect(
      page.getByRole('region', { name: 'Vùng luyện bàn phím vật lý' }),
    ).toBeFocused();
  else
    await expect(
      page.getByLabel('Trang viết của em', { exact: true }),
    ).toBeEnabled();
}
async function result(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Kết quả luyện tập' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText('Đạt · Kết quả đã lưu', { exact: true }),
  ).toBeVisible();
  return dialog;
}
for (const lesson of keyboardLessons.filter((l) => !typingConfig(l).seconds))
  test(`${lesson.id}: physical keys complete and persist`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await start(page, lesson.id);
    for (const code of physicalTargets(typingConfig(lesson)))
      await page.keyboard.press(code);
    await result(page);
    const overview = await (
      await page.request.get('/api/student/overview')
    ).json();
    expect(
      overview.progress.some(
        (p: { lessonId: string }) => p.lessonId === lesson.id,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
for (const lesson of vietnameseLessons)
  test(`${lesson.id}: native Unicode text and correction`, async ({ page }) => {
    await start(page, lesson.id);
    const field = page.getByLabel('Trang viết của em', { exact: true });
    await field.focus();
    if (typingConfig(lesson).initial) {
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Backspace');
    }
    await page.keyboard.insertText(
      lesson.id === 'vietnamese-name'
        ? 'Nguyễn An'
        : typingConfig(lesson).target.normalize('NFD'),
    );
    await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await result(page);
  });
test('integrated Telex and VNI, mode switching, selection/backspace and IME composition', async ({
  page,
}) => {
  await start(page, 'vietnamese-tones');
  await page.getByLabel('Chế độ bộ gõ').selectOption('integrated');
  const field = page.getByLabel('Trang viết của em', { exact: true });
  await field.focus();
  await page.keyboard.type('huuwx cuuws ruouwj quow uuw tieen khuwowsu', {
    delay: 20,
  });
  await expect(field).toHaveValue('hữu cứu rượu quơ ưu tiên khướu');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.getByLabel('Phương pháp gõ').selectOption('vni');
  await field.focus();
  await page.keyboard.type('huu74 cuu71 ruou75 quo7 uu7 tie6n khuo7u1', {
    delay: 20,
  });
  await expect(field).toHaveValue('hữu cứu rượu quơ ưu tiên khướu');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.getByLabel('Phương pháp gõ').selectOption('telex');
  await field.focus();
  await page.keyboard.type('Vieetj Nam ', { delay: 20 });
  await expect(field).toHaveValue('Việt Nam ');
  await page.getByLabel('Phương pháp gõ').selectOption('vni');
  await field.focus();
  await page.keyboard.type('tru7o7ng2 hoc5 ', { delay: 20 });
  await expect(field).toHaveValue('Việt Nam trường học ');
  await page.keyboard.type('may1 tinh1 hoc5 sinh Tie6ng1 Vie6t5 Nguye6n4', {
    delay: 20,
  });
  await expect(field).toHaveValue(
    'Việt Nam trường học máy tính học sinh Tiếng Việt Nguyễn',
  );
  await page.keyboard.press('Backspace');
  await expect(field).toHaveValue(/Nguyễ$/);
  await page.keyboard.type('n');
  await page.getByLabel('Chế độ bộ gõ').selectOption('system');
  await field.evaluate((el: HTMLTextAreaElement) => {
    el.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(el, 'Viee');
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: 'Viee',
        isComposing: true,
        inputType: 'insertCompositionText',
      }),
    );
    el.dispatchEvent(
      new CompositionEvent('compositionupdate', {
        bubbles: true,
        data: 'Viee',
      }),
    );
  });
  await expect(
    page.getByText('Đang ghép dấu… Chưa chấm chữ.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Chế độ bộ gõ')).toBeDisabled();
  await expect(page.locator('.text-comparison .char-wrong')).toHaveCount(0);
  await field.evaluate((el: HTMLTextAreaElement) => {
    const text = 'Việt Nam trường học máy tính học sinh Tiếng Việt Nguyễn';
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(el, text.normalize('NFD'));
    el.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: text }),
    );
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: text,
        inputType: 'insertText',
      }),
    );
  });
  await expect(field).toHaveValue(
    'Việt Nam trường học máy tính học sinh Tiếng Việt Nguyễn',
  );
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await result(page);
});
test('repeat, virtual-key clicks, layout code, focus loss, pause/resume and idle clock', async ({
  page,
}) => {
  await start(page, 'keyboard-home-left');
  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyA');
  await page.keyboard.up('KeyA');
  await expect(page.locator('.current-char')).toHaveText('s');
  await page.locator('[data-code="KeyS"]').click();
  await expect(page.locator('.current-char')).toHaveText('s');
  await page.keyboard.press('Tab');
  await page
    .getByRole('region', { name: 'Vùng luyện bàn phím vật lý' })
    .focus();
  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Nghỉ một chút nhé!' });
  await expect(pause).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(pause).not.toBeVisible();
  for (const code of physicalTargets(
    typingConfig(keyboardLessons.find((l) => l.id === 'keyboard-home-left')!),
  ).slice(1))
    await page.keyboard.press(code);
  await result(page);
  await start(page, 'keyboard-letters');
  await page.waitForTimeout(1200);
  await expect(
    page.locator('.typing-stats>div').last().locator('strong'),
  ).toHaveText('0s');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(pause).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Phân khu', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Rời bài học?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại bài' }).click();
});
test('classroom keyboard and Vietnamese with two isolated contexts and teacher controls', async ({
  browser,
}) => {
  const teacher = await browser.newContext(),
    learner = await browser.newContext();
  await teacher.request.post('/api/auth/login', {
    data: { username: 'e2e-teacher', password: 'e2e-only-passphrase' },
  });
  for (const id of ['keyboard-letters', 'vietnamese-sentence']) {
    const room = await (
      await teacher.request.post('/api/rooms', {
        data: { name: `Phòng ${id}`, lessonId: id },
      })
    ).json();
    await learner.request.post('/api/rooms/join', {
      data: { code: room.code, name: 'Bạn luyện gõ' },
    });
    const page = await learner.newPage();
    await page.goto(
      `/play/${id.startsWith('keyboard-') ? 'keyboard' : 'vietnamese'}/practice/${id}`,
    );
    await expect(
      page.getByRole('button', { name: 'Bắt đầu luyện tập' }),
    ).toBeDisabled();
    for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
      await teacher.request.post(`/api/rooms/${room.code}/state`, {
        data: { revision, state },
      });
    await expect(
      page.getByRole('button', { name: 'Bắt đầu luyện tập' }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 3, state: 'PAUSED' },
    });
    await expect(
      page.getByRole('dialog', { name: 'Nghỉ một chút nhé!' }),
    ).toBeVisible();
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 4, state: 'PLAYING' },
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (id.startsWith('keyboard-')) {
      await page
        .getByRole('region', { name: 'Vùng luyện bàn phím vật lý' })
        .focus();
      for (const code of ['KeyA', 'KeyF', 'KeyJ', 'KeyK'])
        await page.keyboard.press(code);
    } else {
      await page.getByLabel('Trang viết của em', { exact: true }).focus();
      await page.keyboard.insertText('Em yêu trường em.');
      await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    }
    await result(page);
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 5, state: 'FINISHED' },
    });
    await page.close();
  }
  await teacher.close();
  await learner.close();
});
test('desktop/mobile visuals, loaded assets, audio fallback and timed exercise', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [width, height] of [
    [1440, 1100],
    [390, 844],
  ])
    for (const id of ['keyboard-home-both', 'vietnamese-sentence']) {
      await page.setViewportSize({ width: width!, height: height! });
      await start(page, id);
      if (id.startsWith('vietnamese')) {
        await page.getByRole('button', { name: 'Nghe đọc câu mẫu' }).click();
        await expect(
          page.getByText(
            'Bật âm thanh trong thanh điều hướng để nghe Byte nhé.',
            { exact: true },
          ),
        ).toBeVisible();
      }
      await expect(page.locator('[aria-label="Đang tải hình"]')).toHaveCount(0);
      for (const img of await page.locator('.typing-page img').all())
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
        path: `.local/m04-${info.project.name}-${id}-${width}.png`,
        fullPage: true,
      });
    }
  await start(page, 'keyboard-speed-time');
  for (const code of [
    'KeyE',
    'KeyM',
    'Space',
    'KeyH',
    'KeyO',
    'KeyC',
    'Space',
    'KeyG',
    'KeyO',
    'Space',
  ])
    await page.keyboard.press(code);
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await expect(
    page.getByText('Chưa đạt · Kết quả đã lưu', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('one minute exercise expires automatically and persists actual speed', async ({
  page,
}) => {
  test.setTimeout(80000);
  await start(page, 'keyboard-speed-time');
  for (const code of [
    'KeyE',
    'KeyM',
    'Space',
    'KeyH',
    'KeyO',
    'KeyC',
    'Space',
    'KeyG',
    'KeyO',
    'Space',
  ])
    await page.keyboard.press(code);
  const dialog = page.getByRole('dialog', { name: 'Kết quả luyện tập' });
  await expect(dialog).toBeVisible({ timeout: 65000 });
  await expect(
    dialog.getByText('Đạt · Kết quả đã lưu', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/2 WPM · 10 ký tự\/phút/)).toBeVisible();
});

test('a failed save retries the same input log without losing or duplicating rewards', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/typing/attempts/*/result', async (route) => {
    if (calls++ === 0)
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Mất kết nối thử nghiệm' }),
      });
    else await route.continue();
  });
  await start(page, 'keyboard-letters');
  for (const code of ['KeyA', 'KeyF', 'KeyJ', 'KeyK'])
    await page.keyboard.press(code);
  await expect(
    page.getByRole('button', { name: 'Thử lưu lại kết quả' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Thử lưu lại kết quả' }).click();
  await result(page);
  const overview = await (
    await page.request.get('/api/student/overview')
  ).json();
  expect(
    overview.progress.find(
      (p: { lessonId: string }) => p.lessonId === 'keyboard-letters',
    ).completedCount,
  ).toBe(1);
});

test('edits inside a sentence and preserves the caret after NFC normalization', async ({
  page,
}) => {
  await start(page, 'vietnamese-editing');
  await page.getByLabel('Chế độ bộ gõ').selectOption('integrated');
  const field = page.getByLabel('Trang viết của em', { exact: true });
  await field.focus();
  await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 5));
  await page.keyboard.type('n');
  await expect(field).toHaveValue('Em đang học Tin hoc.');
  await field.evaluate((el: HTMLTextAreaElement) => {
    const at = el.value.indexOf('hoc') + 3;
    el.setSelectionRange(at, at);
  });
  await page.keyboard.type('j');
  await expect(field).toHaveValue('Em đang học Tin học.');
  await expect
    .poll(() =>
      field.evaluate(
        (el: HTMLTextAreaElement) =>
          el.selectionStart === el.value.indexOf('.'),
      ),
    )
    .toBe(true);
  await page.getByLabel('Chế độ bộ gõ').selectOption('system');
  await field.focus();
  await field.evaluate((el: HTMLTextAreaElement) => {
    const at = el.value.indexOf('học') + 1;
    el.setSelectionRange(at, at + 1);
  });
  await page.keyboard.insertText('o\u0323');
  await expect(field).toHaveValue('Em đang học Tin học.');
  await expect
    .poll(() =>
      field.evaluate(
        (el: HTMLTextAreaElement) =>
          el.selectionStart === el.value.indexOf('học') + 2,
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await result(page);
});

test('teacher finish submits partial work and the learner can then start free practice', async ({
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
        data: { name: 'Kết thúc luyện gõ', lessonId: 'vietnamese-sentence' },
      })
    ).json();
    await learner.request.post('/api/rooms/join', {
      data: { code: room.code, name: 'Bạn tự luyện' },
    });
    for (const [revision, state] of ['READY', 'COUNTDOWN', 'PLAYING'].entries())
      await teacher.request.post(`/api/rooms/${room.code}/state`, {
        data: { revision, state },
      });
    const page = await learner.newPage();
    await start(page, 'vietnamese-sentence');
    await page.getByLabel('Trang viết của em', { exact: true }).focus();
    await page.keyboard.insertText('Em');
    await teacher.request.post(`/api/rooms/${room.code}/state`, {
      data: { revision: 3, state: 'FINISHED' },
    });
    await expect(
      page.getByText('Chưa đạt · Kết quả đã lưu', { exact: true }),
    ).toBeVisible();
    await start(page, 'keyboard-letters');
    for (const code of ['KeyA', 'KeyF', 'KeyJ', 'KeyK'])
      await page.keyboard.press(code);
    await result(page);
  } finally {
    await teacher.close();
    await learner.close();
  }
});
