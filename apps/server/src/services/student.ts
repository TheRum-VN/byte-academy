import type { Request } from 'express';
import { db } from '../database/client.js';
import { hashToken } from './auth.js';
export async function studentIdentity(req: Request) {
  if (typeof req.cookies.byte_student === 'string') {
    const member = await db.roomMember.findFirst({
      where: {
        tokenHash: hashToken(req.cookies.byte_student),
        expiresAt: { gt: new Date() },
      },
    });
    if (member) return { studentId: member.studentId, roomId: member.roomId };
  }
  if (typeof req.cookies.byte_practice === 'string') {
    const practice = await db.practiceIdentity.findFirst({
      where: {
        tokenHash: hashToken(req.cookies.byte_practice),
        expiresAt: { gt: new Date() },
      },
    });
    if (practice) return { studentId: practice.studentId, roomId: null };
  }
  return null;
}
