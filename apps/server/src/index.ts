import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { registerSockets } from './socket/index.js';
import { db } from './database/client.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@byte/shared';
const app = createApp((room) => io.to(room.id).emit('room:snapshot', room));
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  allowRequest: (req, callback) =>
    callback(
      null,
      !req.headers.origin || req.headers.origin === env.APP_ORIGIN,
    ),
  maxHttpBufferSize: 32_768,
});
registerSockets(io);
server.listen(env.PORT, env.HOST, () =>
  console.log(`Byte Academy: http://localhost:${env.PORT}`),
);
async function shutdown() {
  io.close();
  server.close();
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
