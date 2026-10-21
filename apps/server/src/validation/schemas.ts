import { z } from 'zod';
export const loginSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(1).max(72),
});
export const classroomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grade: z.number().int().min(1).max(5),
});
export const studentSchema = z.object({
  name: z.string().trim().min(1).max(60),
});
export const roomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lessonId: z.string().max(80),
  classroomId: z.string().optional(),
});
export const joinSchema = z.object({
  code: z.string().regex(/^[A-Z2-9]{6}$/),
  name: z.string().trim().min(1).max(60),
});
export const stateSchema = z.object({
  state: z.enum([
    'LOBBY',
    'READY',
    'COUNTDOWN',
    'PLAYING',
    'PAUSED',
    'FINISHED',
    'RESULT',
    'LEADERBOARD',
  ]),
  revision: z.number().int().nonnegative(),
});
