import { randomInt } from 'node:crypto';
import { db } from '../database/client.js';
import {
  transitionRoom,
  type RoomSnapshot,
  type RoomState,
} from '@byte/shared';
export function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => alphabet[randomInt(alphabet.length)],
  ).join('');
}
export async function snapshot(id: string): Promise<RoomSnapshot> {
  const room = await db.room.findUniqueOrThrow({
    where: { id },
    include: {
      sessions: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { members: true } },
    },
  });
  const session = room.sessions[0];
  if (!session) throw new Error('Missing room session');
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    lessonId: session.lessonId,
    state: session.state as RoomState,
    revision: session.revision,
    memberCount: room._count.members,
    serverTime: Date.now(),
  };
}
export async function changeState(
  roomId: string,
  state: RoomState,
  revision: number,
) {
  return db.$transaction(async (tx) => {
    const session = await tx.roomSession.findFirstOrThrow({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: { lesson: true },
    });
    transitionRoom(session.state as RoomState, state);
    if (
      ['READY', 'COUNTDOWN', 'PLAYING'].includes(state) &&
      !session.lesson.available
    )
      throw new Error('Bài học đang phát triển, chưa thể bắt đầu.');
    const updated = await tx.roomSession.updateMany({
      where: { id: session.id, revision },
      data: {
        state,
        revision: { increment: 1 },
        controlLog: JSON.stringify([
          ...(JSON.parse(session.controlLog) as {
            at: number;
            state: string;
          }[]),
          { at: Date.now(), state },
        ]),
      },
    });
    if (updated.count !== 1)
      throw new Error('Phòng đã thay đổi. Vui lòng tải lại.');
  });
}
