import { randomBytes, createHash } from 'node:crypto';
import { db } from '../database/client.js';
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function getTeacher(token?: string) {
  if (!token) return null;
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { teacher: true },
  });
  return session && session.expiresAt > new Date() ? session.teacher : null;
}
export async function membership(token: string | undefined, roomId: string) {
  if (!token) return null;
  return db.roomMember.findFirst({
    where: {
      tokenHash: hashToken(token),
      roomId,
      expiresAt: { gt: new Date() },
    },
  });
}
