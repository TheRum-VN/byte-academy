import { useEffect, useState } from 'react';
import { audioManager, type AudioStatus } from '../services/audio';
import { usePreferences } from '../stores/preferences';

export function useAudio() {
  const { muted, volume } = usePreferences();
  const [status, setStatus] = useState<AudioStatus>();
  useEffect(() => {
    audioManager.configure(muted, volume);
  }, [muted, volume]);
  useEffect(() => () => audioManager.stop(), []);
  async function speak(id: string, text?: string) {
    audioManager.configure(
      usePreferences.getState().muted,
      usePreferences.getState().volume,
    );
    setStatus(await audioManager.play(id, text));
  }
  const message =
    status === 'muted'
      ? 'Bật âm thanh trong thanh điều hướng để nghe Byte nhé.'
      : status === 'unavailable'
        ? 'Máy này chưa có giọng tiếng Việt. Em có thể đọc hướng dẫn bên cạnh nhé.'
        : status === 'blocked'
          ? 'Trình duyệt chưa cho phát âm thanh. Em hãy bấm nghe lại.'
          : '';
  return { speak, message };
}
