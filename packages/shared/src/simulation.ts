import type { Lesson } from './index.js';
import {
  applyVfs,
  createFileSeed,
  getNode,
  isTrashed,
  type VfsCommand,
  type VfsState,
} from './vfs.js';
import {
  applyDesktop,
  createDesktop,
  type DesktopCommand,
  type DesktopState,
  type AppId,
} from './desktop.js';
export interface QuizChoice {
  id: string;
  text: string;
  atlas: string;
  sprite: string;
  correct: boolean;
  reason: string;
}
export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: QuizChoice[];
}
export type FileGoal =
  | { kind: 'open'; id: string }
  | { kind: 'folder'; parentId: string; name: string; originalName?: string }
  | {
      kind: 'parent';
      id: string;
      parentId?: string;
      folderName?: string;
      via?: 'drag';
    }
  | { kind: 'copy'; id: string; parentId: string }
  | { kind: 'restored'; id: string };
export interface SimulationDefinition {
  kind: 'files' | 'desktop' | 'quiz' | 'dismiss';
  number: number;
  goals: { label: string; test: FileGoal }[];
  desktopTask?: string;
  questions?: QuizQuestion[];
}
export interface SimulationState {
  definition: SimulationDefinition;
  files: VfsState | null;
  desktop: DesktopState | null;
  answers: Record<string, string>;
  dismissed: boolean;
  mistakes: number;
  firstActionAt: string | null;
  actions: number;
  resets: number;
}
export type SimulationCommand =
  | { domain: 'files'; command: VfsCommand }
  | { domain: 'desktop'; command: DesktopCommand }
  | { domain: 'quiz'; questionId: string; choiceId: string }
  | { domain: 'dismiss' }
  | { domain: 'reset' };
export interface GoalStatus {
  label: string;
  done: boolean;
}
export interface SimulationSummary {
  score: number;
  accuracy: number;
  durationMs: number;
  correctActions: number;
  wrongActions: number;
  completedTargets: number;
  stars: number;
  passed: boolean;
}
const fileTasks: [string, string, { label: string; test: FileGoal }[]][] = [
  [
    'open',
    'Mở thư mục Hình ảnh',
    [
      {
        label: 'Đang mở đúng thư mục Hình ảnh',
        test: { kind: 'open', id: 'images' },
      },
    ],
  ],
  [
    'create',
    'Tạo thư mục Bài tập',
    [
      {
        label: 'Bài tập là thư mục nằm trong Học tập',
        test: { kind: 'folder', parentId: 'study', name: 'Bài tập' },
      },
    ],
  ],
  [
    'rename',
    'Đổi tên thư mục',
    [
      {
        label: 'Đổi Thư mục mới thành Vở của em',
        test: {
          kind: 'folder',
          parentId: 'study',
          name: 'Vở của em',
          originalName: 'Thư mục mới',
        },
      },
    ],
  ],
  [
    'images',
    'Sắp xếp hai bức ảnh',
    ['flower', 'cat'].map((id) => ({
      label: `${id === 'flower' ? 'Hoa.jpg' : 'Con mèo.png'} ở trong Hình ảnh`,
      test: { kind: 'parent' as const, id, parentId: 'images' },
    })),
  ],
  [
    'video',
    'Đưa video về đúng nhà',
    [
      {
        label: 'Video.mp4 ở trong Video',
        test: { kind: 'parent', id: 'movie', parentId: 'videos' },
      },
    ],
  ],
  [
    'classify',
    'Phân loại theo định dạng',
    Object.entries({
      flower: 'images',
      cat: 'images',
      movie: 'videos',
      song: 'music',
      homework: 'docs',
      schedule: 'pdfs',
      slides: 'presentations',
      sheet: 'sheets',
    }).map(([id, parentId]) => ({
      label: `${({ flower: 'Hoa.jpg', cat: 'Con mèo.png', movie: 'Video.mp4', song: 'Bài hát.mp3', homework: 'Bài tập.docx', schedule: 'Thời khóa biểu.pdf', slides: 'Bài trình chiếu.pptx', sheet: 'Bảng điểm.xlsx' } as Record<string, string>)[id]} → ${({ images: 'Hình ảnh', videos: 'Video', music: 'Âm nhạc', docs: 'Tài liệu', pdfs: 'Tệp PDF', presentations: 'Trình chiếu', sheets: 'Bảng tính' } as Record<string, string>)[parentId]}`,
      test: { kind: 'parent' as const, id, parentId },
    })),
  ],
  [
    'copy',
    'Sao chép một bức ảnh',
    [
      {
        label: 'Có bản sao Hoa.jpg trong Hình ảnh, bản gốc vẫn ở Học tập',
        test: { kind: 'copy', id: 'flower', parentId: 'images' },
      },
    ],
  ],
  [
    'drag',
    'Kéo thả tệp vào thư mục',
    [
      {
        label: 'Kéo Bài tập.docx vào Tài liệu',
        test: { kind: 'parent', id: 'homework', parentId: 'docs', via: 'drag' },
      },
    ],
  ],
  [
    'restore',
    'Xóa rồi khôi phục',
    [
      {
        label: 'Bài hát.mp3 đã qua thùng rác và được khôi phục',
        test: { kind: 'restored', id: 'song' },
      },
    ],
  ],
  [
    'organize',
    'Góc học tập ngăn nắp',
    [
      {
        label: 'Tạo Bài tập trong Học tập rồi đổi thành Góc học tập',
        test: {
          kind: 'folder',
          parentId: 'study',
          name: 'Góc học tập',
          originalName: 'Bài tập',
        },
      },
      ...['homework', 'schedule'].map((id) => ({
        label: `${id === 'homework' ? 'Bài tập.docx' : 'Thời khóa biểu.pdf'} trong Góc học tập`,
        test: { kind: 'parent' as const, id, folderName: 'Góc học tập' },
      })),
      ...['flower', 'cat'].map((id) => ({
        label: `${id === 'flower' ? 'Hoa.jpg' : 'Con mèo.png'} trong Hình ảnh`,
        test: { kind: 'parent' as const, id, parentId: 'images' },
      })),
    ],
  ],
];
const choice = (
  id: string,
  text: string,
  atlas: string,
  sprite: string,
  correct: boolean,
  reason: string,
): QuizChoice => ({ id, text, atlas, sprite, correct, reason });
const devices = [
  {
    id: 'screen',
    text: 'Màn hình',
    sprite: 'desktop_monitor',
    group: 'output',
  },
  {
    id: 'mouse',
    text: 'Chuột',
    sprite: 'mouse_mint_three_quarter',
    group: 'input',
  },
  {
    id: 'keyboard',
    text: 'Bàn phím',
    sprite: 'keyboard_lavender',
    group: 'input',
  },
  { id: 'printer', text: 'Máy in', sprite: 'printer', group: 'output' },
];
const hardwareQuestions: QuizQuestion[] = devices.map((device) => ({
  id: device.id,
  prompt: `Đâu là ${device.text.toLocaleLowerCase('vi')}?`,
  choices: devices.map((d) =>
    choice(
      d.id,
      d.text,
      '03',
      d.sprite,
      d.id === device.id,
      d.id === device.id
        ? `${d.text} giúp chúng ta ${d.group === 'input' ? 'đưa thông tin vào' : 'nhận thông tin từ'} máy tính.`
        : 'Quan sát lại hình và tên thiết bị nhé.',
    ),
  ),
}));
const ioQuestions: QuizQuestion[] = devices.map((device) => ({
  id: device.id,
  prompt: `${device.text} là thiết bị nhập hay xuất?`,
  choices: [
    choice(
      'input',
      'Thiết bị nhập',
      '03',
      device.sprite,
      device.group === 'input',
      `${device.text} là thiết bị ${device.group === 'input' ? 'nhập, đưa thao tác hoặc dữ liệu vào' : 'xuất, cho em nhận kết quả từ'} máy tính.`,
    ),
    choice(
      'output',
      'Thiết bị xuất',
      '03',
      device.sprite,
      device.group === 'output',
      `${device.text} là thiết bị ${device.group === 'input' ? 'nhập, đưa thao tác hoặc dữ liệu vào' : 'xuất, cho em nhận kết quả từ'} máy tính.`,
    ),
  ],
}));
const safetyQuestions: QuizQuestion[][] = [
  [
    {
      id: 'password',
      prompt:
        'Đây chỉ là ví dụ. Mật khẩu nào khó đoán hơn? Không dùng các ví dụ này làm mật khẩu thật.',
      choices: [
        choice(
          'weak',
          '12345678',
          '15',
          'padlock',
          false,
          'Dãy số quen thuộc rất dễ đoán.',
        ),
        choice(
          'name',
          'TenBan2018',
          '15',
          'padlock',
          false,
          'Tên và năm sinh có thể bị người khác đoán được.',
        ),
        choice(
          'strong',
          'La!72May#Vang9Song!26',
          '15',
          'shield_check',
          true,
          'Ví dụ dài, khác biệt và khó đoán hơn. Mỗi tài khoản cần mật khẩu riêng; nhờ người lớn hỗ trợ.',
        ),
      ],
    },
  ],
  [
    {
      id: 'private',
      prompt: 'Thông tin nào em cần giữ riêng, không đăng công khai?',
      choices: [
        choice(
          'address',
          'Địa chỉ nhà và số điện thoại',
          '15',
          'privacy_shield',
          true,
          'Địa chỉ, số điện thoại, mật khẩu cần được giữ riêng và hỏi người lớn trước khi chia sẻ.',
        ),
        choice(
          'color',
          'Màu sắc em thích',
          '15',
          'shield_check',
          false,
          'Màu yêu thích thường không xác định nơi ở của em. Hãy tìm thông tin cần bảo vệ hơn.',
        ),
        choice(
          'animal',
          'Tên một loài vật em thích',
          '15',
          'shield_check',
          false,
          'Hãy tìm thông tin có thể khiến người lạ tìm đến em.',
        ),
      ],
    },
  ],
  [
    {
      id: 'message',
      prompt:
        'Một thông báo nói: “Em trúng quà! Bấm liên kết và nhập mật khẩu.” Em làm gì?',
      choices: [
        choice(
          'send',
          'Nhập mật khẩu để nhận quà',
          '15',
          'warning_triangle',
          false,
          'Không gửi mật khẩu hoặc mã xác nhận để nhận quà.',
        ),
        choice(
          'ask',
          'Không bấm liên kết, nhờ thầy cô hoặc bố mẹ kiểm tra',
          '15',
          'shield_check',
          true,
          'Thông báo bất ngờ, thúc giục và hỏi bí mật có thể là lừa đảo.',
        ),
        choice(
          'share',
          'Gửi liên kết cho các bạn cùng bấm',
          '15',
          'email_envelope',
          false,
          'Không chia sẻ tiếp liên kết đáng ngờ.',
        ),
      ],
    },
  ],
  [
    {
      id: 'stranger',
      prompt:
        'Người lạ trong trò chơi rủ em gặp riêng và dặn đừng nói với ai. Em chọn gì?',
      choices: [
        choice(
          'meet',
          'Đồng ý đi gặp một mình',
          '15',
          'warning_triangle',
          false,
          'Không gặp người lạ một mình hoặc giữ bí mật khiến em lo lắng.',
        ),
        choice(
          'address',
          'Gửi địa chỉ nhà cho người đó',
          '15',
          'privacy_shield',
          false,
          'Không gửi địa chỉ hoặc thông tin riêng cho người lạ.',
        ),
        choice(
          'adult',
          'Dừng trò chuyện, chặn hoặc báo cáo và nói với người lớn đáng tin',
          '15',
          'shield_check',
          true,
          'Bố mẹ, thầy cô có thể giúp em xử lý. Em không có lỗi khi nhờ giúp đỡ.',
        ),
      ],
    },
  ],
];
function lesson(
  id: string,
  module: 'files' | 'computer' | 'safety',
  title: string,
  definition: SimulationDefinition,
  instructions: string[],
): Lesson {
  const count =
    definition.kind === 'files'
      ? definition.goals.length
      : (definition.questions?.length ?? 1);
  return {
    id: `${module}-${id}`,
    module,
    skill: `${module}.${id}`,
    title,
    instructions,
    gradeMin: 1,
    gradeMax: 5,
    difficulty: definition.number < 4 ? 1 : definition.number < 8 ? 2 : 3,
    targetCount: count,
    completionRules: { minAccuracy: 0 },
    scoringRules: { maxScore: 100, pointsPerTarget: 100 / count },
    rewards: [
      {
        id: `${module}-${id}-complete`,
        title: 'Nhà khám phá khéo léo',
        stars: 3,
      },
    ],
    config: { ...definition, version: 1 },
    available: true,
  };
}
export const fileLessons = fileTasks.map(([id, title, goals], i) =>
  lesson(id, 'files', title, { kind: 'files', number: i + 1, goals }, [
    'Đây là hệ thống tệp mô phỏng, không làm thay đổi tệp trên máy của em.',
    ...goals.map((g) => g.label + '.'),
    'Nháy đúp để mở thư mục. Chọn tệp rồi dùng thanh công cụ, menu chuột phải hoặc kéo thả. Nộp bài khi các điều kiện đã đúng.',
  ]),
);
const computerTasks = [
  ['hardware', 'Những người bạn của máy tính'],
  ['input-output', 'Thiết bị nhập và xuất'],
  ['launch', 'Mở ứng dụng'],
  ['close', 'Đóng cửa sổ'],
  ['minimize', 'Thu nhỏ cửa sổ'],
  ['maximize', 'Phóng to cửa sổ'],
  ['drag', 'Di chuyển cửa sổ'],
  ['resize', 'Đổi kích thước cửa sổ'],
  ['switch', 'Hai cửa sổ cùng làm việc'],
  ['taskbar', 'Làm quen thanh tác vụ'],
];
const desktopInstructions: Record<string, string> = {
  launch: 'Nháy đúp biểu tượng Ghi chú của em để mở.',
  close: 'Mở Ghi chú của em, sau đó bấm nút Đóng trên thanh tiêu đề.',
  minimize:
    'Mở Ghi chú của em rồi thu nhỏ. Ứng dụng vẫn còn trên thanh tác vụ.',
  maximize: 'Mở Ghi chú của em rồi phóng to bằng nút trên thanh tiêu đề.',
  drag: 'Mở Ghi chú của em. Kéo thanh tiêu đề sang phải ít nhất 100 đơn vị trên mặt bàn mô phỏng.',
  resize:
    'Mở Ghi chú của em. Kéo góc dưới bên phải để cửa sổ rộng ít nhất 520 và cao ít nhất 330 đơn vị.',
  switch:
    'Mở cả hai ứng dụng, sau đó bấm thanh tiêu đề Ghi chú của em để đưa cửa sổ đó lên trên.',
  taskbar:
    'Mở Ghi chú của em, thu nhỏ, rồi bấm biểu tượng của nó trên thanh tác vụ để mở lại.',
};
export const computerLessons = computerTasks.map(([id, title], i) =>
  lesson(
    id!,
    'computer',
    title!,
    {
      kind: i < 2 ? 'quiz' : 'desktop',
      number: i + 1,
      goals: [],
      ...(i < 2
        ? { questions: i === 0 ? hardwareQuestions : ioQuestions }
        : { desktopTask: id }),
    },
    i < 2
      ? [
          'Quan sát hình thiết bị. Chọn đáp án và đọc giải thích.',
          'Em có thể thử lại nếu chọn nhầm.',
        ]
      : [
          desktopInstructions[id!]!,
          'Đây là môi trường mô phỏng. Không mở hay đóng ứng dụng thật trên máy.',
        ],
  ),
);
export const safetyLessons = [
  ...safetyQuestions.map((questions, i) =>
    lesson(
      ['password', 'privacy', 'suspicious', 'stranger'][i]!,
      'safety',
      [
        'Mật khẩu khó đoán',
        'Giữ thông tin riêng',
        'Thông báo đáng ngờ',
        'Người lạ trên Internet',
      ][i]!,
      { kind: 'quiz', number: i + 1, goals: [], questions },
      [
        'Tình huống và thông tin đều là ví dụ mô phỏng. Không nhập thông tin hay mật khẩu thật.',
        'Chọn cách xử lý an toàn, đọc giải thích và nhờ người lớn nếu em còn băn khoăn.',
      ],
    ),
  ),
  lesson(
    'close-popup',
    'safety',
    'Đóng cửa sổ không mong muốn',
    { kind: 'dismiss', number: 5, goals: [] },
    [
      'Tìm nút Đóng cửa sổ ở góc trên của thông báo mô phỏng.',
      'Không bấm vào lời mời nhận quà trong thông báo.',
    ],
  ),
];
export const simulationLessons = [
  ...fileLessons,
  ...computerLessons,
  ...safetyLessons,
];
export const simulationDefinition = (l: Lesson) =>
  l.config as unknown as SimulationDefinition;
export function createSimulation(
  definition: SimulationDefinition,
  now: string,
): SimulationState {
  return {
    definition: structuredClone(definition),
    files:
      definition.kind === 'files'
        ? createFileSeed(definition.number, now)
        : null,
    desktop: definition.kind === 'desktop' ? createDesktop() : null,
    answers: {},
    dismissed: false,
    mistakes: 0,
    firstActionAt: null,
    actions: 0,
    resets: 0,
  };
}
export function applySimulation(
  source: SimulationState,
  command: SimulationCommand,
  now: string,
): SimulationState {
  if (source.actions >= 500 && command.domain !== 'reset')
    throw new Error(
      'Em đã luyện nhiều thao tác. Hãy nộp bài hoặc đặt lại để luyện tiếp.',
    );
  if (command.domain === 'reset') {
    const fresh = createSimulation(source.definition, now);
    fresh.resets = source.resets + 1;
    return fresh;
  }
  const state = structuredClone(source);
  state.actions++;
  state.firstActionAt ??= now;
  if (command.domain === 'files' && state.files)
    state.files = applyVfs(state.files, command.command, now);
  else if (command.domain === 'desktop' && state.desktop)
    state.desktop = applyDesktop(state.desktop, command.command);
  else if (command.domain === 'quiz' && state.definition.kind === 'quiz') {
    const q = state.definition.questions?.find(
        (q) => q.id === command.questionId,
      ),
      choice = q?.choices.find((c) => c.id === command.choiceId);
    if (!q || !choice) throw new Error('Đáp án không thuộc câu hỏi này.');
    if (!state.answers[q.id]) {
      if (choice.correct) state.answers[q.id] = choice.id;
      else state.mistakes++;
    }
  } else if (
    command.domain === 'dismiss' &&
    state.definition.kind === 'dismiss'
  )
    state.dismissed = true;
  else throw new Error('Thao tác không thuộc bài học này.');
  return state;
}
function fileGoal(state: VfsState, goal: FileGoal) {
  const active = (id: string) => {
    try {
      return !isTrashed(state, id) ? getNode(state, id) : null;
    } catch {
      return null;
    }
  };
  switch (goal.kind) {
    case 'open':
      return state.view === 'folder' && state.currentId === goal.id;
    case 'folder':
      return state.nodes.some(
        (n) =>
          n.type === 'folder' &&
          n.name === goal.name &&
          n.parentId === goal.parentId &&
          !isTrashed(state, n.id) &&
          (!goal.originalName ||
            (n.metadata.originalName === goal.originalName &&
              n.metadata.previousNames?.includes(goal.originalName))),
      );
    case 'parent': {
      const n = active(goal.id);
      const parent =
        goal.parentId ??
        state.nodes.find(
          (n) =>
            n.type === 'folder' &&
            n.parentId === 'study' &&
            n.name === goal.folderName &&
            !isTrashed(state, n.id),
        )?.id;
      return (
        !!n &&
        n.type === 'file' &&
        n.fileExtension ===
          n.metadata.originalName?.split('.').at(-1)?.toLowerCase() &&
        !!parent &&
        n.parentId === parent &&
        (!goal.via || n.metadata.movedBy === goal.via)
      );
    }
    case 'copy':
      return (
        active(goal.id)?.parentId === 'study' &&
        state.nodes.some(
          (n) =>
            n.id !== goal.id &&
            n.metadata.copiedFrom === goal.id &&
            n.fileExtension === active(goal.id)?.fileExtension &&
            n.parentId === goal.parentId &&
            !isTrashed(state, n.id),
        )
      );
    case 'restored': {
      const n = active(goal.id);
      return !!n && n.parentId === 'study' && n.metadata.restored === true;
    }
  }
}
function desktopGoal(state: DesktopState, task: string) {
  const notes = state.windows.find((w) => w.id === 'notes')!,
    gallery = state.windows.find((w) => w.id === 'gallery')!;
  const did = (type: string, id: AppId = 'notes') =>
    state.actions.some((a) => a.type === type && a.id === id);
  switch (task) {
    case 'launch':
      return notes.open && !notes.minimized;
    case 'close':
      return did('launch') && did('close') && !notes.open;
    case 'minimize':
      return notes.open && notes.minimized;
    case 'maximize':
      return notes.open && !notes.minimized && notes.maximized;
    case 'drag':
      return (
        notes.open &&
        !notes.minimized &&
        !notes.maximized &&
        notes.x >= 170 &&
        did('drag')
      );
    case 'resize':
      return (
        notes.open &&
        !notes.minimized &&
        !notes.maximized &&
        notes.width >= 520 &&
        notes.height >= 330 &&
        did('resize')
      );
    case 'switch':
      return (
        notes.open &&
        gallery.open &&
        !notes.minimized &&
        !gallery.minimized &&
        state.focused === 'notes' &&
        did('focus')
      );
    case 'taskbar':
      return (
        notes.open && !notes.minimized && did('minimize') && did('taskbar')
      );
    default:
      return false;
  }
}
export function simulationGoals(state: SimulationState): GoalStatus[] {
  if (state.files)
    return state.definition.goals.map((g) => ({
      label: g.label,
      done: fileGoal(state.files!, g.test),
    }));
  if (state.desktop)
    return [
      {
        label: desktopInstructions[state.definition.desktopTask!]!,
        done: desktopGoal(state.desktop, state.definition.desktopTask!),
      },
    ];
  if (state.definition.kind === 'dismiss')
    return [
      {
        label: 'Đã đóng thông báo bằng nút Đóng cửa sổ',
        done: state.dismissed,
      },
    ];
  return (state.definition.questions ?? []).map((q) => ({
    label: q.prompt,
    done: !!state.answers[q.id],
  }));
}
export function simulationSummary(
  state: SimulationState,
  durationMs: number,
): SimulationSummary {
  const goals = simulationGoals(state),
    done = goals.filter((g) => g.done).length,
    passed = done === goals.length && goals.length > 0;
  const accuracy = done + state.mistakes ? done / (done + state.mistakes) : 0;
  return {
    score: Math.round((done / goals.length) * 100),
    accuracy,
    durationMs: Math.max(0, Math.round(durationMs)),
    correctActions: done,
    wrongActions: state.mistakes,
    completedTargets: done,
    passed,
    stars: passed ? (accuracy >= 0.95 ? 3 : accuracy >= 0.7 ? 2 : 1) : 0,
  };
}
