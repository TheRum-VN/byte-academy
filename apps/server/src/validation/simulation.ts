import { z } from 'zod';
const id = z.string().min(1).max(80),
  name = z.string().max(120);
export const vfsCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), parentId: id, name }),
  z.object({ type: z.literal('rename'), id, name }),
  z.object({ type: z.enum(['delete', 'restore', 'open', 'copy', 'cut']), id }),
  z.object({
    type: z.literal('move'),
    id,
    parentId: id,
    via: z.enum(['drag', 'menu']),
  }),
  z.object({ type: z.literal('paste'), parentId: id }),
  z.object({ type: z.enum(['back', 'trash', 'undo']) }),
  z.object({ type: z.literal('search'), query: z.string().max(80) }),
  z.object({ type: z.literal('sort'), sort: z.enum(['name', 'type']) }),
]);
const appId = z.enum(['notes', 'gallery']);
const desktopCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum([
      'launch',
      'close',
      'minimize',
      'maximize',
      'focus',
      'taskbar',
    ]),
    id: appId,
  }),
  z.object({
    type: z.literal('drag'),
    id: appId,
    x: z.number().finite().min(-2000).max(3000),
    y: z.number().finite().min(-2000).max(3000),
  }),
  z.object({
    type: z.literal('resize'),
    id: appId,
    width: z.number().finite().min(0).max(3000),
    height: z.number().finite().min(0).max(3000),
  }),
]);
export const simulationCommandSchema = z.discriminatedUnion('domain', [
  z.object({ domain: z.literal('files'), command: vfsCommandSchema }),
  z.object({ domain: z.literal('desktop'), command: desktopCommandSchema }),
  z.object({ domain: z.literal('quiz'), questionId: id, choiceId: id }),
  z.object({ domain: z.literal('dismiss') }),
  z.object({ domain: z.literal('reset') }),
]);
