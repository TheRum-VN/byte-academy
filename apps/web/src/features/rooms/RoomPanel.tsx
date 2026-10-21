import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { mouseLessons, typingLessons, simulationLessons } from '@byte/shared';
import type { RoomSnapshot, RoomState } from '@byte/shared';
import { roomSocket } from '../../services/socket';
import { api, post } from '../../services/api';
import { GameBadge, GameCard } from '../../components/ui';
const labels: Record<string, string> = {
  LOBBY: 'Đang chờ thầy cô',
  READY: 'Sẵn sàng',
  COUNTDOWN: 'Chuẩn bị bắt đầu',
  PLAYING: 'Đang học',
  PAUSED: 'Tạm dừng',
  FINISHED: 'Đã kết thúc',
  RESULT: 'Kết quả',
  LEADERBOARD: 'Bảng xếp hạng',
};
const actions: Partial<Record<RoomState, { state: RoomState; label: string }>> =
  {
    LOBBY: { state: 'READY', label: 'Sẵn sàng' },
    READY: { state: 'COUNTDOWN', label: 'Chuẩn bị' },
    COUNTDOWN: { state: 'PLAYING', label: 'Bắt đầu bài học' },
    PLAYING: { state: 'PAUSED', label: 'Tạm dừng cả lớp' },
    PAUSED: { state: 'PLAYING', label: 'Tiếp tục cả lớp' },
    FINISHED: { state: 'RESULT', label: 'Xem kết quả' },
    RESULT: { state: 'LEADERBOARD', label: 'Tổng kết' },
  };
export function RoomPanel({
  initial,
  teacherControl = false,
}: {
  initial: RoomSnapshot;
  teacherControl?: boolean;
}) {
  const [room, setRoom] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Đang kết nối…');
  useEffect(() => {
    let active = true;
    const socket = roomSocket();
    socket.on('connect', () => {
      socket.emit('room:subscribe', { code: initial.code }, (result) => {
        if (active)
          setStatus(
            result.ok
              ? 'Đã kết nối trực tiếp'
              : (result.error ?? 'Kết nối thất bại'),
          );
      });
    });
    socket.on('room:snapshot', (snapshot) => {
      if (active && snapshot.id === initial.id)
        setRoom((current) =>
          snapshot.revision >= current.revision ? snapshot : current,
        );
    });
    socket.on('disconnect', () => {
      if (active) setStatus('Mất kết nối · Đang thử lại…');
    });
    socket.on('connect_error', () => {
      if (active) setStatus('Chưa kết nối được máy chủ');
    });
    // Fetch after subscription setup covers updates between HTTP response and connection.
    void api<RoomSnapshot>(`/rooms/${initial.code}`)
      .then((snapshot) => {
        if (active)
          setRoom((current) =>
            snapshot.revision >= current.revision ? snapshot : current,
          );
      })
      .catch(() => {});
    socket.connect();
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [initial.code, initial.id]);
  const change = async (state: RoomState) => {
    setBusy(true);
    setError('');
    try {
      setRoom(
        await post<RoomSnapshot>(`/rooms/${room.code}/state`, {
          state,
          revision: room.revision,
        }),
      );
    } catch (e) {
      setError(String(e));
      void api<RoomSnapshot>(`/rooms/${room.code}`).then(setRoom);
    } finally {
      setBusy(false);
    }
  };
  const action = actions[room.state];
  const definition = [
    ...mouseLessons,
    ...typingLessons,
    ...simulationLessons,
  ].find((l) => l.id === room.lessonId);
  const playable = !!definition;
  return (
    <GameCard className="room-panel">
      <div className="row">
        <h3>{room.name}</h3>
        <GameBadge>{labels[room.state]}</GameBadge>
      </div>
      <p>
        Mã phòng <strong className="room-code">{room.code}</strong>
      </p>
      <p>{room.memberCount} học sinh đã tham gia</p>
      <p role="status" className="connection">
        {status}
      </p>
      {teacherControl && (
        <div className="modal-actions">
          {action && (
            <button
              className="soft-button"
              disabled={
                busy ||
                (!playable &&
                  ['READY', 'COUNTDOWN', 'PLAYING'].includes(action.state))
              }
              onClick={() => void change(action.state)}
            >
              {action.label}
            </button>
          )}
          {['LOBBY', 'READY', 'COUNTDOWN', 'PLAYING', 'PAUSED'].includes(
            room.state,
          ) && (
            <button
              className="soft-button"
              disabled={busy}
              onClick={() => void change('FINISHED')}
            >
              Kết thúc buổi học
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      {!teacherControl && playable ? (
        <Link
          className="soft-button"
          to={`/play/${definition?.module}/practice/${room.lessonId}`}
          onClick={() =>
            window.dispatchEvent(new Event('byte:close-classroom'))
          }
        >
          {definition?.module === 'mouse'
            ? 'Vào bài luyện chuột'
            : ['keyboard', 'vietnamese'].includes(definition?.module ?? '')
              ? 'Vào bài luyện gõ'
              : 'Vào bài thực hành'}
        </Link>
      ) : (
        !playable && <small>Bài học đang được phát triển.</small>
      )}
    </GameCard>
  );
}
