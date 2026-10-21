import { useState, type FormEvent } from 'react';
import type { JoinResponse } from '@byte/shared';
import { GameButton } from '../../components/ui';
import { post } from '../../services/api';
import { RoomPanel } from './RoomPanel';
export function JoinRoom() {
  const [result, setResult] = useState<JoinResponse>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      setResult(
        await post<JoinResponse>('/rooms/join', {
          code: String(data.get('code')).trim().toUpperCase(),
          name: data.get('name'),
        }),
      );
      window.dispatchEvent(new Event('byte:refresh'));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div>
        <p>Xin chào {result.student.name}!</p>
        <RoomPanel initial={result.room} />
      </div>
    );
  return (
    <form onSubmit={submit} className="form-stack">
      <p>Nhập mã 6 ký tự thầy cô cung cấp để vào phòng học.</p>
      <label>
        Mã phòng
        <input
          name="code"
          placeholder="Ví dụ: ABC234"
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z2-9]{6}"
          autoComplete="off"
          required
          className="code-input"
        />
      </label>
      <label>
        Tên của em
        <input
          name="name"
          placeholder="Nhập tên của em"
          maxLength={60}
          autoComplete="given-name"
          required
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <GameButton type="submit" disabled={busy}>
        {busy ? 'Đang tham gia…' : 'Vào phòng học'}
      </GameButton>
    </form>
  );
}
