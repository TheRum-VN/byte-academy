import { describe, it, expect } from 'vitest';
import {
  PhysicalKeyboard,
  TypingRun,
  typingMetrics,
  keyboardRows,
  fingerFor,
  codeFor,
  typingConfig,
  typingLessons,
  keyboardLessons,
  vietnameseLessons,
  physicalTargets,
  CompositionGate,
  compareText,
  graphemes,
  editVietnamese,
  type InputMethod,
} from '@byte/shared';
function convert(raw: string, method: InputMethod) {
  let value = '';
  for (const key of raw)
    value = editVietnamese(
      value,
      value.length,
      value.length,
      key,
      method,
    ).value;
  return value;
}
describe('Vietnamese syllable engine', () => {
  const corpus = [
    ['huuwx', 'huu74', 'hữu'],
    ['cuuws', 'cuu71', 'cứu'],
    ['ruouwj', 'ruou75', 'rượu'],
    ['quow', 'quo7', 'quơ'],
    ['uuw tieen', 'uu7 tie6n', 'ưu tiên'],
    ['khuwowsu', 'khuo7u1', 'khướu'],
    ['Vieetj Nam', 'Vie6t5 Nam', 'Việt Nam'],
    ['truwowngf hocj', 'tru7o7ng2 hoc5', 'trường học'],
    ['mays tinhs', 'may1 tinh1', 'máy tính'],
    ['hocj sinh', 'hoc5 sinh', 'học sinh'],
    ['Tieengs Vieetj', 'Tie6ng1 Vie6t5', 'Tiếng Việt'],
    ['Nguyeenx', 'Nguye6n4', 'Nguyễn'],
    ['Em yeeu truwowngf em.', 'Em ye6u truong72 em.', 'Em yêu trường em.'],
    ['Hoom nay trowif ddepj.', 'Ho6m nay tro7i2 d9ep5.', 'Hôm nay trời đẹp.'],
    [
      'Em ddang hocj Tin hocj.',
      'Em d9ang hoc5 Tin hoc5.',
      'Em đang học Tin học.',
    ],
    [
      'Truwowngf em cos nhieeuf caay xanh.',
      'Tru7o7ng2 em co1 nhie6u2 ca6y xanh.',
      'Trường em có nhiều cây xanh.',
    ],
    [
      'Chungs em cungf nhau hocj taapj.',
      'Chung1 em cung2 nhau hoc5 ta6p5.',
      'Chúng em cùng nhau học tập.',
    ],
    ['quaans', 'qua6n1', 'quấn'],
    ['gias', 'gia1', 'giá'],
    ['ngoaif', 'ngoai2', 'ngoài'],
    ['tieeusr', 'tie6u13', 'tiểu'],
    ['ddi', 'd9i', 'đi'],
    ['DDawngj', 'D9a8ng5', 'Đặng'],
    ['NGUYEENX', 'NGUYE6N4', 'NGUYỄN'],
    ['Vieejt', 'Vie65t', 'Việt'],
    ['duwowngf', 'duong72', 'dường'],
    ['nghieeng', 'nghie6ng', 'nghiêng'],
    ['tuyeets', 'tuye6t1', 'tuyết'],
    ['quoocs', 'quo6c1', 'quốc'],
    ['khuya', 'khuya', 'khuya'],
    ['huowngs', 'huong71', 'hướng'],
  ];
  for (const [telex, vni, expected] of corpus) {
    it(`Telex ${telex}`, () => expect(convert(telex!, 'telex')).toBe(expected));
    it(`VNI ${vni}`, () => expect(convert(vni!, 'vni')).toBe(expected));
  }
  const shapes = [
    ['aa', 'a6', 'â'],
    ['aw', 'a8', 'ă'],
    ['ee', 'e6', 'ê'],
    ['oo', 'o6', 'ô'],
    ['ow', 'o7', 'ơ'],
    ['uw', 'u7', 'ư'],
    ['dd', 'd9', 'đ'],
  ];
  for (const [t, v, e] of shapes)
    it(`shapes/case ${e}`, () => {
      expect(convert(t!, 'telex')).toBe(e);
      expect(convert(v!, 'vni')).toBe(e);
      expect(convert(t!.toUpperCase(), 'telex')).toBe(e!.toUpperCase());
      expect(convert(v!.toUpperCase(), 'vni')).toBe(e!.toUpperCase());
    });
  for (const [i, key] of [...'sfrxj'].entries())
    it(`tone ${key} over all vowels`, () => {
      const vowels = [
        'a',
        'ă',
        'â',
        'e',
        'ê',
        'i',
        'o',
        'ô',
        'ơ',
        'u',
        'ư',
        'y',
      ];
      const mark = ['\u0301', '\u0300', '\u0309', '\u0303', '\u0323'][i];
      for (const v of vowels) {
        expect(convert(v + key, 'telex')).toBe((v + mark).normalize('NFC'));
        expect(convert(v + (i + 1), 'vni')).toBe((v + mark).normalize('NFC'));
      }
    });
  it('tone replacement, clearing and literal escape', () => {
    expect(convert('uoww', 'telex')).toBe('uow');
    expect(convert('uuww', 'telex')).toBe('uuw');
    expect(convert('uo77', 'vni')).toBe('uo7');
    expect(convert('a66', 'vni')).toBe('a6');
    expect(convert('a88', 'vni')).toBe('a8');
    expect(convert('d99', 'vni')).toBe('d9');
    expect(convert('asf', 'telex')).toBe('à');
    expect(convert('asz', 'telex')).toBe('a');
    expect(convert('a10', 'vni')).toBe('a');
    expect(convert('ass', 'telex')).toBe('as');
    expect(convert('aaa', 'telex')).toBe('aa');
  });
  it('edits a selection, mid-sentence and decomposed Unicode without moving suffix', () => {
    expect(editVietnamese('Em hoc Tin', 6, 6, 'j', 'telex')).toEqual({
      value: 'Em học Tin',
      caret: 6,
    });
    expect(editVietnamese('Em hoc Tin', 3, 6, 'a', 'telex')).toEqual({
      value: 'Em a Tin',
      caret: 4,
    });
    expect(editVietnamese('Vie\u0302t Nam', 5, 5, 'j', 'telex')).toEqual({
      value: 'Việt Nam',
      caret: 4,
    });
    expect(editVietnamese('Việt Nam', 4, 4, ',', 'telex')).toEqual({
      value: 'Việt, Nam',
      caret: 5,
    });
  });
});
describe('Unicode and composition gate', () => {
  it('compares NFC graphemes including combining marks', () => {
    expect(graphemes('Nguyễn')).toHaveLength(6);
    expect(
      compareText('Nguyễn', 'Nguyễn'.normalize('NFD')).every(
        (c) => c.state === 'correct',
      ),
    ).toBe(true);
    expect(compareText('máy', 'mày').map((c) => c.state)).toEqual([
      'correct',
      'wrong',
      'correct',
    ]);
    expect(compareText('học', 'họ').at(-1)?.state).toBe('pending');
  });
  it('never evaluates composition updates and commits once stable', () => {
    const gate = new CompositionGate();
    gate.start();
    expect(gate.input('Vie')).toBeNull();
    gate.update();
    expect(gate.input('Viee')).toBeNull();
    expect(gate.end('Việt'.normalize('NFD'))).toBe('Việt');
    expect(gate.input('Việt')).toBe('Việt');
    expect(gate.input('x', true)).toBeNull();
  });
});
describe('physical keyboard and scoring', () => {
  it('maps every standard finger group and home indicators', () => {
    expect(fingerFor('KeyF')).toBe('left-index');
    expect(fingerFor('KeyJ')).toBe('right-index');
    expect(fingerFor('KeyB')).toBe('left-index');
    expect(fingerFor('Digit6')).toBe('right-index');
    expect(fingerFor('Semicolon')).toBe('right-pinky');
    expect(fingerFor('Space')).toBe('thumb');
    expect(keyboardRows.flat().every((k) => !!k.finger)).toBe(true);
    expect(codeFor(';')).toBe('Semicolon');
  });
  it('handles down/up, repeat, modifiers, shortcuts and focus reset', () => {
    const keys = new PhysicalKeyboard();
    const key = { code: 'KeyA', key: 'q' };
    expect(keys.down(key)).toBe(true);
    expect(keys.down(key)).toBe(false);
    keys.up('KeyA');
    expect(keys.down({ ...key, repeat: true })).toBe(false);
    expect(keys.down({ ...key, ctrlKey: true })).toBe(false);
    expect(keys.down({ ...key, altKey: true })).toBe(false);
    expect(keys.down({ ...key, metaKey: true })).toBe(false);
    expect(keys.down({ ...key, isComposing: true })).toBe(false);
    expect(keys.down({ code: 'Tab', key: 'Tab' })).toBe(false);
    expect(keys.down(key)).toBe(true);
    keys.clear();
    expect(keys.down(key)).toBe(true);
  });
  it('uses physical code across layouts and excludes time before first accepted input', () => {
    const run = new TypingRun({
      kind: 'physical',
      target: 'af',
      group: 'test',
    });
    run.input({ type: 'down', t: 10000, code: 'KeyA', key: 'q' });
    run.input({ type: 'up', t: 10100, code: 'KeyA' });
    run.input({ type: 'down', t: 11000, code: 'KeyF', key: 'f' });
    expect(run.summary()).toMatchObject({
      passed: true,
      durationMs: 1000,
      accuracy: 1,
      completedTargets: 2,
    });
  });
  it('Backspace repairs progress without adding errors; held keys never advance twice', () => {
    const run = new TypingRun({
      kind: 'physical',
      target: 'aa',
      group: 'test',
    });
    for (const e of [
      { code: 'KeyA', key: 'a', t: 100 },
      { code: 'KeyA', key: 'a', t: 200 },
      { code: 'Backspace', key: 'Backspace', t: 300 },
    ])
      run.input({ type: 'down', ...e });
    expect(run.cursor).toBe(0);
    run.input({ type: 'clear', t: 400 });
    run.input({ type: 'down', t: 500, code: 'KeyA', key: 'a' });
    expect(run.cursor).toBe(1);
    expect(run.errors).toBe(0);
  });
  it('WPM is CPM / 5, accuracy includes errors, slow beginners pass', () => {
    expect(typingMetrics(1, 0, 35000, true)).toMatchObject({
      cpm: 2,
      wpm: 0.3,
    });
    expect(typingMetrics(50, 10, 60000, true)).toMatchObject({
      cpm: 50,
      wpm: 10,
      accuracy: 50 / 60,
      errorCount: 10,
      stars: 2,
    });
    expect(typingMetrics(5, 0, 600000, true)).toMatchObject({
      passed: true,
      stars: 3,
    });
    expect(typingMetrics(0, 0, 0, false)).toMatchObject({
      cpm: 0,
      wpm: 0,
      score: 0,
      accuracy: 0,
      stars: 0,
    });
    expect(typingMetrics(5, 5, 1000, false)).toMatchObject({
      passed: false,
      stars: 0,
    });
  });
  it('breaks a physical streak on errors and retains the longest run', () => {
    const run = new TypingRun({
      kind: 'physical',
      target: 'asd',
      group: 'test',
    });
    for (const [i, code] of ['KeyA', 'KeyX', 'KeyS', 'KeyD'].entries()) {
      run.input({ type: 'down', t: i * 100, code, key: code });
      run.input({ type: 'up', t: i * 100 + 10, code });
    }
    expect(run.summary()).toMatchObject({
      correctActions: 3,
      errorCount: 1,
      longestStreak: 2,
      accuracy: 0.75,
      passed: true,
      stars: 1,
    });
  });
  it('replays stable text, deletion, correction, uppercase and mode switches', () => {
    const run = new TypingRun({
      kind: 'text',
      target: 'Việt Nam',
      group: 'test',
    });
    run.input({ type: 'mode', t: 0, mode: 'integrated', method: 'telex' });
    run.input({ type: 'text', t: 1000, value: 'Viet' });
    run.input({ type: 'text', t: 2000, value: 'Vie' });
    run.input({ type: 'mode', t: 2100, mode: 'system', method: 'vni' });
    run.input({ type: 'text', t: 3000, value: 'Việt Nam'.normalize('NFD') });
    expect(run.summary()).toMatchObject({
      passed: true,
      accuracy: 1,
      durationMs: 2000,
      longestStreak: 8,
    });
    expect(run.mode).toBe('system');
    expect(run.method).toBe('vni');
  });
  it('all 27 lessons have complete, valid data and at least 10 per module', () => {
    expect(keyboardLessons.length).toBeGreaterThanOrEqual(10);
    expect(vietnameseLessons.length).toBeGreaterThanOrEqual(10);
    expect(
      typingLessons.every(
        (l) =>
          l.available &&
          typingConfig(l).target.normalize('NFC') === typingConfig(l).target,
      ),
    ).toBe(true);
    expect(
      keyboardLessons.every((l) =>
        physicalTargets(typingConfig(l)).every(Boolean),
      ),
    ).toBe(true);
  });
  it('timed tasks require ten correct characters and the full minute', () => {
    const run = new TypingRun({
      kind: 'physical',
      target: 'a'.repeat(100),
      seconds: 60,
      group: 'test',
    });
    for (let i = 0; i < 10; i++) {
      run.input({ type: 'down', t: i * 100, code: 'KeyA', key: 'a' });
      run.input({ type: 'up', t: i * 100 + 10, code: 'KeyA' });
    }
    expect(run.summary(59999).passed).toBe(false);
    expect(run.summary(60000).passed).toBe(true);
  });
});
