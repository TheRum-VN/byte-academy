import { useEffect, useRef, useState } from 'react';
import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';

export function FullscreenButton() {
  const button = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const changed = () =>
      setActive(
        document.fullscreenElement ===
          button.current?.closest('.typing-page,.simulation-page'),
      );
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  async function toggle() {
    try {
      const screen = button.current?.closest('.typing-page,.simulation-page');
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (screen?.requestFullscreen) await screen.requestFullscreen();
      else setMessage('Em có thể dùng F11 để bật toàn màn hình.');
    } catch {
      setMessage('Chưa bật được toàn màn hình. Em có thể dùng F11.');
    }
  }
  return (
    <>
      <button
        ref={button}
        className="soft-button practice-fullscreen-button"
        aria-label={active ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        onClick={() => void toggle()}
      >
        {active ? <ArrowsIn size={22} /> : <ArrowsOut size={22} />}
      </button>
      {message && (
        <span className="practice-screen-message" role="status">
          {message}
        </span>
      )}
    </>
  );
}
