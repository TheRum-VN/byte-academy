import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import { SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import { useSprite } from '../hooks/useSprite';
import { usePreferences } from '../stores/preferences';
import { audioManager } from '../services/audio';
import type { Lesson } from '@byte/shared';
import styles from './ui.module.css';
export function Sprite({
  atlas,
  name,
  alt = '',
  className = '',
}: {
  atlas: string;
  name: string;
  alt?: string;
  className?: string;
}) {
  const { path, error } = useSprite(atlas, name);
  return path ? (
    <img className={className} src={path} alt={alt} draggable={false} />
  ) : (
    <span
      role={error ? 'status' : undefined}
      className={`${styles.imageState} ${className}`}
      aria-label={error ? 'Không tải được hình' : 'Đang tải hình'}
    >
      {error && alt ? 'Hình chưa tải được' : ''}
    </span>
  );
}
export function GameButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${styles.button} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function GameCard({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.card} ${className}`}
    >
      {children}
    </motion.section>
  );
}
export function GameBadge({ children }: PropsWithChildren) {
  return <span className={styles.badge}>{children}</span>;
}
export function GameProgress({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <label className={styles.progress}>
      {label}
      <progress max={100} value={Math.min(100, Math.max(0, value))} />
    </label>
  );
}
export function StarCounter({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value} sao`}>
      <Sprite atlas="12" name="star_gold" className={styles.rewardStar} />
      {value}
    </span>
  );
}
export function ByteMascot({
  className = '',
  animated = false,
  pose = 'wave_right',
}: {
  className?: string;
  animated?: boolean;
  pose?: string;
}) {
  if (animated)
    return (
      <span
        className={`byte-animated ${className}`}
        role="img"
        aria-label="Byte, người bạn robot đồng hành"
      >
        <Sprite
          atlas="01"
          name="wave_right"
          className="byte-pose byte-pose-one"
        />
        <Sprite
          atlas="01"
          name="idle_three_quarter"
          className="byte-pose byte-pose-two"
        />
      </span>
    );
  return (
    <Sprite
      atlas="01"
      name={pose}
      alt="Byte, người bạn robot đồng hành"
      className={className}
    />
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <GameCard>
      <GameBadge>
        Lớp {lesson.gradeMin}–{lesson.gradeMax}
      </GameBadge>
      <h3>{lesson.title}</h3>
      <p>{lesson.instructions[0]}</p>
      <p className="development">
        {lesson.available
          ? 'Có thể luyện tập'
          : 'Đang phát triển · Chưa mở luyện tập'}
      </p>
    </GameCard>
  );
}
export function LoadingScreen({
  label = 'Đang chuẩn bị hành trình…',
}: {
  label?: string;
}) {
  return (
    <div role="status" className="loading">
      <span className={styles.spinner} />
      {label}
    </div>
  );
}
export function AudioControl() {
  const { muted, toggleAudio } = usePreferences();
  return (
    <button
      className="icon-button"
      onClick={() => {
        toggleAudio();
        const s = usePreferences.getState();
        audioManager.configure(s.muted, s.volume);
        if (!s.muted) void audioManager.play('welcome');
      }}
      aria-pressed={!muted}
      aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
    >
      {muted ? <SpeakerSlash size={23} /> : <SpeakerHigh size={23} />}
    </button>
  );
}
export function GameModal({
  title,
  onClose,
  children,
  className = '',
}: PropsWithChildren<{
  title: string;
  onClose: () => void;
  className?: string;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => {
        if (returnFocus?.isConnected && !document.querySelector('dialog[open]'))
          returnFocus.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="row">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Đóng">
          <X size={24} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
