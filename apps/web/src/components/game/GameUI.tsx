import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  SpeakerHigh,
  SignOut,
} from '@phosphor-icons/react';
import {
  GameButton,
  GameModal,
  GameProgress,
  Sprite,
  StarCounter,
} from '../ui';
import { useAudio } from '../../hooks/useAudio';
import './game.css';

export function GameTopBar({
  title,
  stars,
  onBack,
  onPause,
}: {
  title: string;
  stars: number;
  onBack: () => void;
  onPause?: () => void;
}) {
  return (
    <header className="game-topbar">
      <button className="soft-button" onClick={onBack}>
        <ArrowLeft size={19} /> Quay lại
      </button>
      <strong>{title}</strong>
      <StarCounter value={stars} />
      {onPause && (
        <button className="icon-button" aria-label="Tạm dừng" onClick={onPause}>
          <Pause size={24} />
        </button>
      )}
    </header>
  );
}
export function GameInstructionBubble({
  text,
  voiceId,
}: {
  text: string;
  voiceId: string;
}) {
  const { speak, message } = useAudio();
  return (
    <div className="instruction-wrap">
      <div className="instruction-bubble">
        <button
          className="icon-button"
          aria-label="Nghe hướng dẫn"
          onClick={() => void speak(voiceId, text)}
        >
          <SpeakerHigh size={25} weight="fill" />
        </button>
        <p>{text}</p>
      </div>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
export interface GameSkill {
  id: string;
  title: string;
  atlas: string;
  sprite: string;
}
export function GameSkillSidebar({
  skills,
  activeId,
  onSelect,
}: {
  skills: GameSkill[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="game-skills" aria-label="Kỹ năng bài học">
      {skills.map((skill) => (
        <button
          key={skill.id}
          aria-pressed={activeId === skill.id}
          onClick={() => onSelect(skill.id)}
        >
          <Sprite atlas={skill.atlas} name={skill.sprite} />
          <span>{skill.title}</span>
        </button>
      ))}
    </nav>
  );
}
export function GameScorePanel({
  score,
  maxScore,
  stars,
}: {
  score: number | null;
  maxScore: number;
  stars: number;
}) {
  return (
    <section className="game-score" aria-label="Điểm bài học">
      <span>
        Điểm cao nhất{' '}
        <strong>
          {score === null ? 'Chưa có lượt chơi' : `${score}/${maxScore}`}
        </strong>
      </span>
      <StarCounter value={stars} />
    </section>
  );
}
/** Resets per duration, pauses with the game, and fires expiry once per reset. */
export function GameTimer({
  durationSeconds,
  running = false,
  onExpire,
}: {
  durationSeconds?: number;
  running?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const remainingRef = useRef(durationSeconds);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    remainingRef.current = durationSeconds;
    setRemaining(durationSeconds);
  }, [durationSeconds]);
  useEffect(() => {
    if (
      !running ||
      remainingRef.current === undefined ||
      remainingRef.current <= 0
    )
      return;
    const deadline = Date.now() + remainingRef.current * 1000;
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      remainingRef.current = next;
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(timer);
        expireRef.current?.();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, durationSeconds]);
  return (
    <span className="game-timer" aria-label="Thời gian còn lại">
      {remaining === undefined
        ? 'Không giới hạn thời gian'
        : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
    </span>
  );
}
export function GameLevelProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <GameProgress
      value={total ? (completed / total) * 100 : 0}
      label={`${completed}/${total} nhiệm vụ hoàn thành`}
    />
  );
}
export function RewardCelebration({
  stars,
  children,
}: {
  stars: number;
  children?: ReactNode;
}) {
  return (
    <div className="reward-celebration">
      <Sprite atlas="01" name="celebrate_victory" />
      <div>
        <Sprite atlas="12" name="star_gold" />
        <strong>+{stars} sao</strong>
      </div>
      {children}
    </div>
  );
}
export function GameResultModal({
  score,
  stars,
  completed,
  total,
  onRetry,
  onClose,
}: {
  score: number;
  stars: number;
  completed: number;
  total: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <GameModal title="Kết quả luyện tập" onClose={onClose}>
      <RewardCelebration stars={stars} />
      <p>
        Điểm của em: <strong>{score}</strong>
      </p>
      <GameLevelProgress completed={completed} total={total} />
      <div className="modal-actions">
        <GameButton onClick={onRetry}>Luyện tập lại</GameButton>
        <button className="soft-button" onClick={onClose}>
          Về phân khu
        </button>
      </div>
    </GameModal>
  );
}
export function GamePauseOverlay({
  onResume,
  onExit,
}: {
  onResume: () => void;
  onExit: () => void;
}) {
  return (
    <GameModal title="Nghỉ một chút nhé!" onClose={onResume}>
      <Sprite atlas="01" name="idle_front" className="pause-byte" />
      <div className="modal-actions">
        <GameButton onClick={onResume}>
          <Play size={20} /> Tiếp tục
        </GameButton>
        <button className="soft-button" onClick={onExit}>
          <SignOut size={20} /> Rời bài
        </button>
      </div>
    </GameModal>
  );
}
export function ConfirmExitModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <GameModal title="Em muốn rời bài học?" onClose={onCancel}>
      <p>Lượt đang chơi chưa hoàn thành sẽ không được tính kết quả.</p>
      <div className="modal-actions">
        <GameButton onClick={onCancel}>Ở lại học tiếp</GameButton>
        <button className="soft-button" onClick={onConfirm}>
          Rời bài học
        </button>
      </div>
    </GameModal>
  );
}
