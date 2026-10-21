import type { Lesson } from './index.js';
import {
  compareText,
  graphemes,
  type InputMode,
  type InputMethod,
} from './vietnamese.js';
export type Finger =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky'
  | 'thumb';
export const fingerNames: Record<Finger, string> = {
  'left-pinky': 'Ngón út trái',
  'left-ring': 'Ngón áp út trái',
  'left-middle': 'Ngón giữa trái',
  'left-index': 'Ngón trỏ trái',
  'right-index': 'Ngón trỏ phải',
  'right-middle': 'Ngón giữa phải',
  'right-ring': 'Ngón áp út phải',
  'right-pinky': 'Ngón út phải',
  thumb: 'Ngón cái',
};
export interface VirtualKey {
  code: string;
  label: string;
  finger: Finger;
  width?: number;
}
const fingerCodes: Record<Finger, string[]> = {
  'left-pinky': [
    'Backquote',
    'Digit1',
    'KeyQ',
    'KeyA',
    'KeyZ',
    'Tab',
    'CapsLock',
    'ShiftLeft',
  ],
  'left-ring': ['Digit2', 'KeyW', 'KeyS', 'KeyX'],
  'left-middle': ['Digit3', 'KeyE', 'KeyD', 'KeyC'],
  'left-index': [
    'Digit4',
    'Digit5',
    'KeyR',
    'KeyT',
    'KeyF',
    'KeyG',
    'KeyV',
    'KeyB',
  ],
  'right-index': [
    'Digit6',
    'Digit7',
    'KeyY',
    'KeyU',
    'KeyH',
    'KeyJ',
    'KeyN',
    'KeyM',
  ],
  'right-middle': ['Digit8', 'KeyI', 'KeyK', 'Comma'],
  'right-ring': ['Digit9', 'KeyO', 'KeyL', 'Period'],
  'right-pinky': [
    'Digit0',
    'Minus',
    'Equal',
    'Backspace',
    'KeyP',
    'BracketLeft',
    'BracketRight',
    'Backslash',
    'Semicolon',
    'Quote',
    'Enter',
    'Slash',
    'ShiftRight',
  ],
  thumb: ['Space'],
};
export function fingerFor(code: string): Finger | undefined {
  return (Object.keys(fingerCodes) as Finger[]).find((f) =>
    fingerCodes[f].includes(code),
  );
}
const rowCodes = [
  [
    'Backquote',
    ...Array.from({ length: 10 }, (_, i) => `Digit${(i + 1) % 10}`),
    'Minus',
    'Equal',
    'Backspace',
  ],
  [
    'Tab',
    ...'QWERTYUIOP'.split('').map((c) => `Key${c}`),
    'BracketLeft',
    'BracketRight',
    'Backslash',
  ],
  [
    'CapsLock',
    ...'ASDFGHJKL'.split('').map((c) => `Key${c}`),
    'Semicolon',
    'Quote',
    'Enter',
  ],
  [
    'ShiftLeft',
    ...'ZXCVBNM'.split('').map((c) => `Key${c}`),
    'Comma',
    'Period',
    'Slash',
    'ShiftRight',
  ],
  ['Space'],
];
const labels: Record<string, string> = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  Backspace: '⌫',
  Tab: 'Tab',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  CapsLock: 'Caps',
  Semicolon: ';',
  Quote: "'",
  Enter: 'Enter',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Space: 'Dấu cách',
};
export const keyboardRows: VirtualKey[][] = rowCodes.map((row) =>
  row.map((code) => ({
    code,
    label: labels[code] ?? code.replace(/^(Key|Digit)/, ''),
    finger: fingerFor(code)!,
    width:
      code === 'Space'
        ? 7
        : [
              'Backspace',
              'CapsLock',
              'Enter',
              'ShiftLeft',
              'ShiftRight',
            ].includes(code)
          ? 1.7
          : code === 'Tab'
            ? 1.4
            : 1,
  })),
);
export function codeFor(char: string) {
  if (/^[a-z]$/i.test(char)) return `Key${char.toUpperCase()}`;
  if (/^[0-9]$/.test(char)) return `Digit${char}`;
  return (
    {
      ' ': 'Space',
      '\n': 'Enter',
      ';': 'Semicolon',
      ',': 'Comma',
      '.': 'Period',
      '/': 'Slash',
      "'": 'Quote',
      '-': 'Minus',
      '[': 'BracketLeft',
      ']': 'BracketRight',
    } as Record<string, string>
  )[char];
}
export interface TypingConfig {
  kind: 'physical' | 'text';
  target: string;
  group: string;
  mode?: 'recognize' | 'copy';
  seconds?: number;
  initial?: string;
  personalName?: boolean;
}
const keyboardData: [string, string, string, string, string?][] = [
  ['letters', 'Làm quen bàn phím', 'Tìm các phím chữ', 'afjk', 'recognize'],
  [
    'numbers',
    'Làm quen bàn phím',
    'Tìm các phím số',
    '1234567890',
    'recognize',
  ],
  [
    'special',
    'Làm quen bàn phím',
    'Space, Enter, Backspace, Shift',
    'Space Enter Backspace ShiftLeft',
    'special',
  ],
  ['home-left', 'Hàng phím cơ sở', 'Bốn ngón tay trái', 'asdf asdf'],
  ['home-right', 'Hàng phím cơ sở', 'Bốn ngón tay phải', 'jkl; jkl;'],
  ['home-center', 'Hàng phím cơ sở', 'Hai ngón trỏ: G và H', 'fg jh gh hg'],
  [
    'home-both',
    'Hàng phím cơ sở',
    'Hai tay cùng phối hợp',
    'asdf jkl; asdf jkl;',
  ],
  ['top-left', 'Hàng phím trên', 'Vươn tay trái lên trên', 'qwert qwer tr'],
  ['top-right', 'Hàng phím trên', 'Vươn tay phải lên trên', 'yuiop yuio py'],
  ['top-move', 'Hàng phím trên', 'Đi rồi về hàng cơ sở', 'fr ft ju jy dk ei'],
  ['bottom-left', 'Hàng phím dưới', 'Khám phá Z X C V B', 'zxcvb zxcv bv'],
  ['bottom-right', 'Hàng phím dưới', 'N M và dấu câu', 'nm,./ nm,./'],
  ['words-short', 'Gõ từ', 'Những từ ngắn', 'ba me em be ban'],
  ['words-long', 'Gõ từ', 'Từ ngắn, từ dài', 'may tinh truong hoc ban phim'],
  [
    'speed-count',
    'Luyện tốc độ',
    'Hoàn thành một dòng chữ',
    'ban phim may tinh em hoc go chu ban phim may tinh em hoc go chu',
  ],
  [
    'speed-time',
    'Luyện tốc độ',
    'Một phút tập trung',
    Array(8).fill('em hoc go ban phim ').join(''),
    'timed',
  ],
];
const viData: [string, string, string, string?][] = [
  ['name', 'Tên của em', 'Em', 'name'],
  ['letters', 'Chữ cái tiếng Việt', 'a ă â e ê i o ô ơ u ư y đ'],
  ['vowels', 'Nguyên âm có dấu', 'á à ả ã ạ ấ ầ ắ ằ ế ề ố ồ ớ ờ ứ ừ'],
  ['words', 'Những từ ngắn', 'ba mẹ bé bà ông'],
  [
    'tones',
    'Dấu thanh quanh em',
    'Việt Nam trường học máy tính học sinh Tiếng Việt Nguyễn',
  ],
  ['sentence', 'Câu đầu tiên', 'Em yêu trường em.'],
  [
    'sentences',
    'Ngày mới đến trường',
    'Hôm nay trời đẹp. Em đang học Tin học.',
  ],
  [
    'punctuation',
    'Dấu câu kể chuyện',
    'Bạn ơi, cùng học nhé! Trường em có nhiều cây xanh.',
  ],
  [
    'paragraph',
    'Câu chuyện của chúng em',
    'Em yêu trường em. Trường em có nhiều cây xanh. Chúng em cùng nhau học tập.',
  ],
  ['editing', 'Cùng Byte sửa lỗi', 'Em đang học Tin học.', 'edit'],
  [
    'speed',
    'Gõ đều và chính xác',
    'Hôm nay trời đẹp. Chúng em cùng nhau học tập.',
  ],
];
function makeLesson(
  id: string,
  module: 'keyboard' | 'vietnamese',
  title: string,
  config: TypingConfig,
  index: number,
): Lesson {
  const targetCount =
    config.kind === 'physical'
      ? physicalTargets(config).length
      : graphemes(config.target).length;
  return {
    id: `${module}-${id}`,
    module,
    skill: `${module}.${config.group}`,
    title,
    instructions:
      module === 'keyboard'
        ? [
            'Đặt ngón trỏ trái lên F, ngón trỏ phải lên J. Các ngón còn lại nghỉ trên hàng cơ sở.',
            'Nhìn phím sáng và dùng đúng ngón. Nhấn rồi thả phím, không cần vội.',
            'Dùng bàn phím thật. Phím ảo chỉ hướng dẫn; Escape để nghỉ.',
          ]
        : [
            'Chọn bộ gõ trên máy hoặc bộ gõ tích hợp trước khi bắt đầu.',
            'Bộ gõ tích hợp: chuyển bàn phím máy sang tiếng Anh; chọn Telex hoặc VNI.',
            'Em có thể dùng phím mũi tên, chọn chữ, Backspace và Delete để sửa. Bấm Nộp bài khi xong.',
          ],
    gradeMin: 1,
    gradeMax: 5,
    difficulty: index < 4 ? 1 : index < 10 ? 2 : 3,
    targetCount,
    timeLimit: config.seconds,
    completionRules: { minAccuracy: index < 4 ? 0.5 : 0.7 },
    scoringRules: { pointsPerTarget: 100 / targetCount, maxScore: 100 },
    rewards: [
      {
        id: `${module}-${id}-complete`,
        title: module === 'keyboard' ? 'Đôi tay khéo léo' : 'Chữ Việt thân yêu',
        stars: 3,
      },
    ],
    config: { ...config, version: 1 },
    available: true,
  };
}
export const keyboardLessons = keyboardData.map(
  ([id, group, title, target, mode], i) =>
    makeLesson(
      id,
      'keyboard',
      title,
      {
        kind: 'physical',
        target,
        group,
        mode: mode === 'recognize' || mode === 'special' ? 'recognize' : 'copy',
        ...(mode === 'special'
          ? { target: 'Space Enter Backspace ShiftLeft' }
          : {}),
        ...(mode === 'timed' ? { seconds: 60 } : {}),
      },
      i,
    ),
);
export const vietnameseLessons = viData.map(([id, title, target, mode], i) =>
  makeLesson(
    id,
    'vietnamese',
    title,
    {
      kind: 'text',
      group: `Cấp ${i + 1}`,
      target,
      ...(mode === 'name' ? { personalName: true } : {}),
      ...(mode === 'edit' ? { initial: 'Em đag học Tin hoc.' } : {}),
    },
    i,
  ),
);
export const typingLessons = [...keyboardLessons, ...vietnameseLessons];
export const typingConfig = (lesson: Lesson): TypingConfig =>
  lesson.config as unknown as TypingConfig;
export function physicalTargets(config: TypingConfig): string[] {
  return config.target.includes('ShiftLeft')
    ? config.target.split(' ')
    : graphemes(config.target).map((c) => codeFor(c)!);
}
export interface KeyStroke {
  code: string;
  key: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
}
export class PhysicalKeyboard {
  held = new Set<string>();
  down(event: KeyStroke): boolean {
    if (
      event.repeat ||
      this.held.has(event.code) ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.isComposing ||
      !fingerFor(event.code) ||
      ['Tab', 'CapsLock'].includes(event.code)
    )
      return false;
    this.held.add(event.code);
    return true;
  }
  up(code: string) {
    this.held.delete(code);
  }
  clear() {
    this.held.clear();
  }
}
export type TypingEvent = {
  t: number;
  type: 'down' | 'up' | 'clear' | 'text' | 'mode' | 'finish';
  code?: string;
  key?: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  value?: string;
  mode?: InputMode;
  method?: InputMethod;
};
export interface TypingSummary {
  score: number;
  accuracy: number;
  durationMs: number;
  correctActions: number;
  wrongActions: number;
  completedTargets: number;
  stars: number;
  passed: boolean;
  cpm: number;
  wpm: number;
  longestStreak: number;
  errorCount: number;
}
export function typingMetrics(
  correct: number,
  errors: number,
  durationMs: number,
  complete: boolean,
  minAccuracy = 0.7,
  longestStreak = 0,
): TypingSummary {
  const accuracy = correct + errors ? correct / (correct + errors) : 0;
  const cpm = durationMs > 0 ? Math.round((correct * 60000) / durationMs) : 0;
  const passed = complete && accuracy >= minAccuracy;
  return {
    score: Math.round(accuracy * 100),
    accuracy,
    durationMs: Math.round(durationMs),
    correctActions: correct,
    wrongActions: errors,
    completedTargets: correct,
    stars: passed ? (accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2 : 1) : 0,
    passed,
    cpm,
    wpm:
      durationMs > 0
        ? Math.round(((correct * 60000) / durationMs / 5) * 10) / 10
        : 0,
    longestStreak,
    errorCount: errors,
  };
}
export class TypingRun {
  keyboard = new PhysicalKeyboard();
  events: TypingEvent[] = [];
  value: string;
  cursor = 0;
  errors = 0;
  streak = 0;
  longest = 0;
  first: number | null = null;
  last = 0;
  mode: InputMode = 'system';
  method: InputMethod = 'telex';
  constructor(
    public config: TypingConfig,
    public minAccuracy = 0.7,
  ) {
    this.value = config.initial ?? '';
  }
  input(event: TypingEvent) {
    this.events.push(event);
    this.last = event.t;
    if (event.type === 'clear') {
      this.keyboard.clear();
      return;
    }
    if (event.type === 'mode') {
      this.mode = event.mode ?? this.mode;
      this.method = event.method ?? this.method;
      return;
    }
    if (event.type === 'up') {
      this.keyboard.up(event.code ?? '');
      return;
    }
    if (event.type === 'down' && this.config.kind === 'physical') {
      if (
        !this.keyboard.down({
          code: event.code ?? '',
          key: event.key ?? '',
          ...event,
        })
      )
        return;
      this.first ??= event.t;
      const targets = physicalTargets(this.config);
      if (event.code === 'Backspace' && targets[this.cursor] !== 'Backspace') {
        this.cursor = Math.max(0, this.cursor - 1);
        this.streak = 0;
        return;
      }
      if (this.cursor >= targets.length) return;
      if (event.code === targets[this.cursor]) {
        this.cursor++;
        this.streak++;
        this.longest = Math.max(this.longest, this.streak);
      } else {
        this.errors++;
        this.streak = 0;
      }
    }
    if (
      event.type === 'text' &&
      this.config.kind === 'text' &&
      event.value !== undefined
    ) {
      if (event.value === this.value) return;
      this.first ??= event.t;
      this.value = event.value.normalize('NFC');
    }
  }
  summary(durationMs = Math.max(0, this.last - (this.first ?? this.last))) {
    if (this.config.kind === 'physical') {
      const count = physicalTargets(this.config).length;
      const complete =
        this.cursor === count ||
        (!!this.config.seconds &&
          durationMs >= this.config.seconds * 1000 &&
          this.cursor >= 10);
      return typingMetrics(
        this.cursor,
        this.errors,
        durationMs,
        complete,
        this.minAccuracy,
        this.longest,
      );
    }
    const diff = compareText(this.config.target, this.value);
    const correct = diff.filter((c) => c.state === 'correct').length,
      errors = diff.filter((c) => c.state === 'wrong').length;
    let streak = 0,
      longest = 0;
    for (const c of diff) {
      streak = c.state === 'correct' ? streak + 1 : 0;
      longest = Math.max(streak, longest);
    }
    return typingMetrics(
      correct,
      errors,
      durationMs,
      this.value.normalize('NFC') === this.config.target.normalize('NFC'),
      this.minAccuracy,
      longest,
    );
  }
}
