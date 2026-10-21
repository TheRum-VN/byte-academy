import { useEffect, useState } from 'react';
import type { RoomSnapshot } from '@byte/shared';
import { api } from '../../services/api';
import { roomSocket } from '../../services/socket';
export function useTypingRoom(initial: RoomSnapshot | null) {
  const [room, setRoom] = useState(initial),
    [connected, setConnected] = useState(!initial);
  useEffect(() => {
    if (initial)
      setRoom((r) => (!r || initial.revision >= r.revision ? initial : r));
  }, [initial]);
  useEffect(() => {
    if (!room?.code) return;
    const code = room.code,
      socket = roomSocket();
    let active = true;
    const update = (r: RoomSnapshot) => {
      if (active && r.code === code)
        setRoom((old) => (!old || r.revision >= old.revision ? r : old));
    };
    socket.on('connect', () =>
      socket.emit('room:subscribe', { code }, (ack) => {
        if (ack.ok)
          void api<RoomSnapshot>(`/rooms/${code}`)
            .then((r) => {
              update(r);
              if (active) setConnected(true);
            })
            .catch(() => setConnected(false));
        else setConnected(false);
      }),
    );
    socket.on('room:snapshot', update);
    socket.on('disconnect', () => {
      if (active) setConnected(false);
    });
    socket.on('connect_error', () => {
      if (active) setConnected(false);
    });
    socket.connect();
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [room?.code]);
  return { room, connected };
}
