import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@byte/shared';
export function roomSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> {
  return io({
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
}
