import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@byte/shared';
import { db } from '../database/client.js';
import { getTeacher, membership } from '../services/auth.js';
import { snapshot } from '../services/rooms.js';
function cookies(header: string = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((s) => s.trim().split('='))
      .filter((p) => p.length === 2),
  );
}
export function registerSockets(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
  io.on('connection', (socket) => {
    const credentials = cookies(socket.handshake.headers.cookie);
    let subscriptions = 0;
    socket.on('room:subscribe', async (payload, ack) => {
      if (typeof ack !== 'function') return;
      if (++subscriptions > 20) {
        ack({ ok: false, error: 'Quá nhiều yêu cầu.' });
        return;
      }
      try {
        if (
          typeof payload?.code !== 'string' ||
          !/^[A-Z2-9]{6}$/.test(payload.code)
        )
          throw new Error('Mã phòng chưa đúng.');
        const room = await db.room.findUnique({
          where: { code: payload.code },
        });
        if (!room) throw new Error('Không tìm thấy phòng.');
        const teacher = await getTeacher(credentials.byte_teacher);
        if (
          teacher?.id !== room.teacherId &&
          !(await membership(credentials.byte_student, room.id))
        )
          throw new Error('Không có quyền truy cập.');
        await socket.join(room.id);
        socket.emit('room:snapshot', await snapshot(room.id));
        ack({ ok: true });
      } catch {
        ack({
          ok: false,
          error: 'Không thể kết nối phòng. Hãy tham gia lại hoặc đăng nhập.',
        });
      }
    });
  });
  // Revalidate long-running connections so expired/revoked sessions lose access.
  const timer = setInterval(async () => {
    for (const socket of io.sockets.sockets.values()) {
      try {
        const c = cookies(socket.handshake.headers.cookie);
        for (const roomId of socket.rooms) {
          if (roomId === socket.id) continue;
          const room = await db.room.findUnique({ where: { id: roomId } });
          const teacher = await getTeacher(c.byte_teacher);
          if (
            !room ||
            (teacher?.id !== room.teacherId &&
              !(await membership(c.byte_student, roomId)))
          )
            await socket.leave(roomId);
        }
      } catch {
        socket.disconnect(true);
      }
    }
  }, 30_000);
  timer.unref();
  io.engine.on('close', () => clearInterval(timer));
}
