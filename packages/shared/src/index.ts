export const modules = [
  {
    id: 'mouse',
    title: 'Vương quốc Chuột',
    description: 'Làm quen, nháy chuột và kéo thả.',
    color: 'mint',
    atlas: '14',
    sprite: 'module_mouse_kingdom',
    grades: 'Lớp 1–5',
  },
  {
    id: 'keyboard',
    title: 'Học viện Bàn phím',
    description: 'Khám phá phím, luyện gõ 10 ngón.',
    color: 'lavender',
    atlas: '14',
    sprite: 'module_keyboard_academy',
    grades: 'Lớp 1–5',
  },
  {
    id: 'files',
    title: 'Thành phố Tệp tin',
    description: 'Sắp xếp tệp và thư mục của em.',
    color: 'yellow',
    atlas: '14',
    sprite: 'module_file_city',
    grades: 'Lớp 1–5',
  },
  {
    id: 'vietnamese',
    title: 'Xưởng gõ Tiếng Việt',
    description: 'Gõ những dòng chữ có dấu thật đẹp.',
    color: 'peach',
    atlas: '14',
    sprite: 'module_vietnamese_typing',
    grades: 'Lớp 1–5',
  },
  {
    id: 'computer',
    title: 'Khám phá máy tính',
    description: 'Làm quen với người bạn máy tính.',
    color: 'cyan',
    atlas: '15',
    sprite: 'desktop_monitor',
    grades: 'Lớp 1–5',
  },
  {
    id: 'safety',
    title: 'An toàn trên Internet',
    description: 'Học cách bảo vệ mình trên Internet.',
    color: 'mint',
    atlas: '15',
    sprite: 'shield_check',
    grades: 'Lớp 1–5',
  },
] as const;
export type ModuleId = (typeof modules)[number]['id'];
export interface LearningModule {
  id: ModuleId;
  title: string;
  skillIds: string[];
}
export interface LearningSkill {
  id: string;
  module: ModuleId;
  title: string;
}
export interface Reward {
  id: string;
  title: string;
  stars: number;
}
export interface Lesson {
  id: string;
  module: ModuleId;
  skill: string;
  title: string;
  instructions: string[];
  gradeMin: number;
  gradeMax: number;
  difficulty: 1 | 2 | 3;
  targetCount: number;
  timeLimit?: number;
  completionRules: { minAccuracy: number };
  scoringRules: { pointsPerTarget: number; maxScore: number };
  rewards: Reward[];
  config: Record<string, unknown>;
  available: boolean;
}
export interface Level {
  id: string;
  lessonId: string;
  order: number;
  missionIds: string[];
}
export interface Mission {
  id: string;
  skillId: string;
  target: number;
}
export interface Student {
  id: string;
  name: string;
  classroomId?: string;
}
export interface Classroom {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
}
export interface Attempt {
  id: string;
  studentId: string;
  lessonId: string;
  sessionId?: string;
  state: GameState;
  skillId: string;
  levelId: string;
  startedAt: string;
}
export interface Result {
  attemptId: string;
  score: number;
  accuracy: number;
  durationMs: number;
  completedTargets: number;
  correctActions: number;
  wrongActions: number;
  stars: number;
  passed: boolean;
  completedAt: string;
}
export type GameState =
  | 'IDLE'
  | 'INSTRUCTIONS'
  | 'READY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESULT';
export type RoomState =
  | 'LOBBY'
  | 'READY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'FINISHED'
  | 'RESULT'
  | 'LEADERBOARD';
const gameTransitions: Record<GameState, readonly GameState[]> = {
  IDLE: ['INSTRUCTIONS'],
  INSTRUCTIONS: ['READY'],
  READY: ['COUNTDOWN'],
  COUNTDOWN: ['PLAYING'],
  PLAYING: ['PAUSED', 'COMPLETED', 'FAILED'],
  PAUSED: ['PLAYING', 'FAILED'],
  COMPLETED: ['RESULT'],
  FAILED: ['RESULT'],
  RESULT: ['IDLE'],
};
const roomTransitions: Record<RoomState, readonly RoomState[]> = {
  LOBBY: ['READY', 'FINISHED'],
  READY: ['COUNTDOWN', 'FINISHED'],
  COUNTDOWN: ['PLAYING', 'FINISHED'],
  PLAYING: ['PAUSED', 'FINISHED'],
  PAUSED: ['PLAYING', 'FINISHED'],
  FINISHED: ['RESULT'],
  RESULT: ['LEADERBOARD'],
  LEADERBOARD: [],
};
export function transitionGame(from: GameState, to: GameState): GameState {
  if (!gameTransitions[from]?.includes(to))
    throw new Error('Invalid game transition');
  return to;
}
export function transitionRoom(from: RoomState, to: RoomState): RoomState {
  if (!roomTransitions[from]?.includes(to))
    throw new Error('Invalid room transition');
  return to;
}
export interface RoomSession {
  id: string;
  state: RoomState;
  lessonId: string;
  revision: number;
}
export interface Room {
  id: string;
  code: string;
  name: string;
  session: RoomSession;
  students: Student[];
}
export interface RoomSnapshot {
  id: string;
  code: string;
  name: string;
  lessonId: string;
  state: RoomState;
  revision: number;
  memberCount: number;
  serverTime?: number;
}
export interface ApiError {
  error: string;
}
export interface JoinResponse {
  room: RoomSnapshot;
  student: Student;
  participantToken?: never;
}
/** Read-only summary scoped to the current HttpOnly student membership. */
export interface StudentOverview {
  student: { id: string; name: string } | null;
  classroom: { name: string; grade: number } | null;
  room: RoomSnapshot | null;
  progress: { lessonId: string; completedCount: number; bestScore: number }[];
  achievements: { rewardId: string; stars: number }[];
  activeLessonIds: string[];
  todayCompletedLessonIds: string[];
}
export interface ServerToClientEvents {
  'room:snapshot': (room: RoomSnapshot) => void;
}
export interface ClientToServerEvents {
  'room:subscribe': (
    payload: { code: string },
    ack: (result: { ok: boolean; error?: string }) => void,
  ) => void;
}
export const lessons: Lesson[] = modules.map((m) => ({
  id: `${m.id}-intro`,
  module: m.id,
  skill: `${m.id}.basics`,
  title: `Làm quen: ${m.title}`,
  instructions: [
    'Đọc hướng dẫn cùng thầy cô.',
    'Thực hành từng thao tác theo nhiệm vụ.',
  ],
  gradeMin: m.id === 'files' || m.id === 'vietnamese' ? 2 : 1,
  gradeMax: 5,
  difficulty: 1,
  targetCount: 5,
  completionRules: { minAccuracy: 0.8 },
  scoringRules: { pointsPerTarget: 20, maxScore: 100 },
  rewards: [{ id: `${m.id}-first`, title: 'Bước chân đầu tiên', stars: 1 }],
  config: {
    version: 1,
    retired: true,
  },
  available: false,
}));
// M01 intro records remain addressable for existing rooms; mouse practice is M03.
import { mouseLessons } from './mouse.js';
lessons.push(...mouseLessons);
export * from './mouse.js';
import { typingLessons } from './typing.js';
lessons.push(...typingLessons);
export * from './typing.js';
export * from './vietnamese.js';
import { simulationLessons } from './simulation.js';
lessons.push(...simulationLessons);
export * from './simulation.js';
export * from './vfs.js';
export * from './desktop.js';
