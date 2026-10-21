import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  Check,
  Pause,
  Play,
  ArrowCounterClockwise,
  SpeakerHigh,
} from '@phosphor-icons/react';
import {
  simulationLessons,
  type SimulationCommand,
  type SimulationState,
  type GoalStatus,
  type SimulationSummary,
} from '@byte/shared';
import {
  ByteMascot,
  GameButton,
  GameModal,
  GameProgress,
  LoadingScreen,
  Sprite,
  StarCounter,
} from '../../components/ui';
import { useStudentData } from '../../features/student/StudentData';
import { useTypingRoom as usePracticeRoom } from '../typing/useTypingRoom';
import { api, post } from '../../services/api';
import { useAudio } from '../../hooks/useAudio';
import { FileExplorer } from './FileExplorer';
import { ComputerDesktop } from './ComputerDesktop';
import { ScenarioQuiz } from './ScenarioQuiz';
import './simulation.css';
import { FullscreenButton } from '../../components/game/FullscreenButton';
interface Ticket {
  id: string;
  revision: number;
  paused: boolean;
  roomSessionId: string | null;
  state: SimulationState;
  goals: GoalStatus[];
}
export function SimulationGamePage() {
  const { lessonId } = useParams(),
    lesson = simulationLessons.find((l) => l.id === lessonId);
  return lesson ? (
    <SimulationLesson key={lesson.id} lessonId={lesson.id} />
  ) : (
    <p>Không tìm thấy bài thực hành.</p>
  );
}
function SimulationLesson({ lessonId }: { lessonId: string }) {
  const lesson = simulationLessons.find((l) => l.id === lessonId)!,
    { overview, refresh } = useStudentData(),
    { room, connected } = usePracticeRoom(overview?.room ?? null),
    { speak, message } = useAudio();
  const [ticket, setTicket] = useState<Ticket | null>(null),
    [phase, setPhase] = useState<'ready' | 'playing' | 'saving' | 'result'>(
      'ready',
    ),
    [busy, setBusy] = useState(false),
    [paused, setPaused] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [reset, setReset] = useState(false),
    [summary, setSummary] = useState<SimulationSummary | null>(null);
  const current = useRef(ticket);
  current.current = ticket;
  const lock = useRef(false),
    pauseFlight = useRef(false),
    phaseRef = useRef(phase);
  phaseRef.current = phase;
  const assigned =
      !!room && !['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state),
    roomBlocked =
      !!ticket?.roomSessionId && (!connected || room?.state !== 'PLAYING');
  const blocked = paused || roomBlocked,
    blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const disabled = blocked || busy || uncertain || phase !== 'playing';
  async function begin() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const t = await post<Ticket>('/simulation/attempts', { lessonId });
      setTicket(t);
      setPaused(t.paused);
      setUncertain(false);
      setPhase('playing');
      setNotice('Trạng thái bài được lưu riêng tại máy chủ.');
    } catch (e) {
      setError(String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (!current.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const t = await api<Ticket>(`/simulation/attempts/${current.current.id}`);
      setTicket(t);
      setPaused(t.paused);
      setUncertain(false);
      setError('');
      setNotice('Đã tải lại trạng thái được lưu.');
    } catch (e) {
      setError(String(e));
      setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function command(action: SimulationCommand) {
    const t = current.current;
    if (
      !t ||
      lock.current ||
      blockedRef.current ||
      uncertain ||
      phaseRef.current !== 'playing'
    )
      return false;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await post<Ticket>(`/simulation/attempts/${t.id}/action`, {
        revision: t.revision,
        action,
      });
      setTicket(next);
      setNotice(
        action.domain === 'reset'
          ? 'Bài đã được đặt lại. Các bài khác được giữ nguyên.'
          : 'Đã lưu thao tác.',
      );
      return true;
    } catch (e) {
      setError(String(e));
      try {
        const restored = await api<Ticket>(`/simulation/attempts/${t.id}`);
        setTicket(restored);
        setPaused(restored.paused);
      } catch {
        setUncertain(true);
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function pause(value: boolean) {
    const t = current.current;
    if (!t || pauseFlight.current || phaseRef.current !== 'playing') return;
    pauseFlight.current = true;
    if (value) {
      blockedRef.current = true;
      setPaused(true);
    }
    try {
      await post(`/attempts/${t.id}/pause`, { paused: value });
      setPaused(value);
    } catch (e) {
      setPaused(true);
      setError(String(e));
    } finally {
      pauseFlight.current = false;
    }
  }
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    const blur = () => {
      if (phaseRef.current === 'playing' && !blockedRef.current)
        void pauseRef.current(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  async function save() {
    const t = current.current;
    if (!t || lock.current) return;
    lock.current = true;
    setPhase('saving');
    setError('');
    try {
      setSummary(
        await post<SimulationSummary>(`/simulation/attempts/${t.id}/result`, {
          revision: t.revision,
        }),
      );
      setPhase('result');
      refresh();
    } catch (e) {
      setError(String(e));
      setPhase('playing');
      setUncertain(true);
    } finally {
      lock.current = false;
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (
      ticket?.roomSessionId &&
      connected &&
      room &&
      ['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state) &&
      phase === 'playing' &&
      !busy &&
      !uncertain
    )
      void saveRef.current();
  }, [ticket?.roomSessionId, connected, room, phase, busy, uncertain]);
  const done = ticket?.goals.filter((g) => g.done).length ?? 0,
    total = ticket?.goals.length ?? lesson.targetCount;
  const next = simulationLessons.filter((l) => l.module === lesson.module)[
    simulationLessons
      .filter((l) => l.module === lesson.module)
      .findIndex((l) => l.id === lessonId) + 1
  ];
  return (
    <section
      className={`simulation-page module-${lesson.module}`}
      onKeyDown={(e) => {
        if (
          e.key === 'Escape' &&
          !e.defaultPrevented &&
          !(
            e.target instanceof Element &&
            e.target.closest('dialog,[role="menu"]')
          ) &&
          phase === 'playing' &&
          !blocked &&
          !reset
        ) {
          e.preventDefault();
          void pause(true);
        }
      }}
    >
      <header className="simulation-header">
        <Link className="soft-button" to={`/play/${lesson.module}`}>
          <ArrowLeft size={20} />
          Về phân khu
        </Link>
        <div>
          <span>
            {lesson.module === 'files'
              ? 'THÀNH PHỐ TỆP TIN'
              : lesson.module === 'computer'
                ? 'KHÁM PHÁ MÁY TÍNH'
                : 'AN TOÀN SỐ'}{' '}
            · BÀI {lesson.config.number as number}
          </span>
          <h1>{lesson.title}</h1>
        </div>
        <FullscreenButton />
        <button
          className="soft-button"
          disabled={phase !== 'playing' || busy}
          onClick={() => void pause(true)}
        >
          <Pause size={20} />
          Tạm dừng
        </button>
      </header>
      <div className="simulation-instructions">
        <ByteMascot pose="explaining" />
        <p>
          {lesson.module === 'files'
            ? lesson.instructions.slice(1, -1).join(' ')
            : lesson.instructions[0]}
        </p>
        <button
          className="soft-button"
          onClick={() =>
            void speak(`${lesson.id}-guide`, lesson.instructions.join(' '))
          }
        >
          <SpeakerHigh size={21} />
          Nghe hướng dẫn
        </button>
      </div>
      {message && (
        <p className="simulation-message" role="status">
          {message}
        </p>
      )}
      {phase === 'ready' ? (
        <div className="simulation-ready">
          <Sprite
            atlas={
              lesson.module === 'files'
                ? '09'
                : lesson.module === 'computer'
                  ? '03'
                  : '15'
            }
            name={
              lesson.module === 'files'
                ? 'folder_assignments_yellow'
                : lesson.module === 'computer'
                  ? 'desktop_monitor'
                  : 'shield_check'
            }
          />
          <div>
            <h2>
              {lesson.module === 'files'
                ? 'Cùng sắp xếp một thành phố ngăn nắp'
                : lesson.module === 'computer'
                  ? 'Một góc máy tính để em khám phá'
                  : 'Bình tĩnh, quan sát và chọn cách an toàn'}
            </h2>
            <p>{lesson.instructions.at(-1)}</p>
            <p>
              Tiến độ trong từng bài được lưu tại máy chủ. Em có thể tiếp tục
              sau khi tải lại trang.
            </p>
            <GameButton
              disabled={
                busy ||
                (assigned &&
                  (!connected ||
                    room.state !== 'PLAYING' ||
                    room.lessonId !== lessonId))
              }
              onClick={() => void begin()}
            >
              <Play size={22} />
              {busy
                ? 'Đang mở…'
                : assigned && room.state !== 'PLAYING'
                  ? 'Chờ thầy cô bắt đầu'
                  : 'Bắt đầu thực hành'}
            </GameButton>
          </div>
        </div>
      ) : (
        ticket && (
          <>
            <div className="simulation-actionbar">
              <GameProgress
                value={(done / total) * 100}
                label={`Điều kiện đã đúng: ${done}/${total}`}
              />
              <button
                className="soft-button"
                disabled={disabled}
                onClick={() => setReset(true)}
              >
                <ArrowCounterClockwise size={20} />
                Đặt lại bài
              </button>
              <GameButton disabled={disabled} onClick={() => void save()}>
                Nộp bài
              </GameButton>
            </div>
            <div className="simulation-layout">
              <div className="simulation-playfield">
                {ticket.state.files ? (
                  <FileExplorer
                    key={`${ticket.id}-${ticket.state.resets}`}
                    state={ticket.state.files}
                    disabled={disabled}
                    onCommand={(c) => command({ domain: 'files', command: c })}
                    error={error}
                  />
                ) : ticket.state.desktop ? (
                  <ComputerDesktop
                    state={ticket.state.desktop}
                    disabled={disabled}
                    onCommand={(c) =>
                      command({ domain: 'desktop', command: c })
                    }
                  />
                ) : (
                  <ScenarioQuiz
                    key={`${ticket.id}-${ticket.state.resets}`}
                    state={ticket.state}
                    disabled={disabled}
                    onCommand={command}
                  />
                )}
              </div>
              <aside className="simulation-goals">
                <h2>Nhiệm vụ của em</h2>
                {ticket.goals.map((g, i) => (
                  <div key={i} className={g.done ? 'goal-done' : ''}>
                    <span>{g.done ? <Check size={17} /> : i + 1}</span>
                    <p>{g.label}</p>
                  </div>
                ))}
                <Sprite
                  atlas="12"
                  name={
                    lesson.module === 'files'
                      ? 'badge_file_management'
                      : lesson.module === 'computer'
                        ? 'medal_lavender'
                        : 'medal_gold'
                  }
                />
                <p>
                  Máy chủ kiểm tra trạng thái thật của bài. Nộp bài chưa đủ điều
                  kiện sẽ chưa được tính hoàn thành.
                </p>
              </aside>
            </div>
            <p className="simulation-message" role="status">
              {busy ? 'Đang lưu thao tác…' : notice}
            </p>
          </>
        )
      )}
      {error && (
        <p className="simulation-error" role="alert">
          {error}
        </p>
      )}
      {uncertain && (
        <div className="simulation-recover">
          <p>
            Chưa xác nhận được trạng thái cuối. Hãy tải lại dữ liệu đã lưu trước
            khi thao tác tiếp.
          </p>
          <GameButton disabled={busy} onClick={() => void reload()}>
            Tải trạng thái đã lưu
          </GameButton>
          <button
            className="soft-button"
            disabled={busy}
            onClick={() => void save()}
          >
            Thử lưu lại kết quả
          </button>
        </div>
      )}
      {blocked && phase === 'playing' && !uncertain && (
        <GameModal
          title="Nghỉ một chút nhé!"
          onClose={() => {
            if (!roomBlocked) void pause(false);
          }}
        >
          <ByteMascot pose="idle_front" className="simulation-pause-byte" />
          <p>
            {roomBlocked
              ? 'Đang chờ giáo viên tiếp tục hoặc kết nối lại phòng học.'
              : 'Thao tác đang tạm dừng. Dữ liệu đã lưu vẫn được giữ nguyên.'}
          </p>
          {!roomBlocked && (
            <GameButton onClick={() => void pause(false)}>Tiếp tục</GameButton>
          )}
          <Link className="soft-button" to={`/play/${lesson.module}`}>
            Về phân khu
          </Link>
          {error && <p role="alert">{error}</p>}
        </GameModal>
      )}
      {reset && (
        <GameModal title="Đặt lại bài học?" onClose={() => setReset(false)}>
          <p>
            Thay cây thư mục hoặc màn hình của bài này bằng trạng thái ban đầu?
            Thao tác này xóa lịch sử undo của lượt hiện tại. Các bài khác được
            giữ nguyên.
          </p>
          <GameButton
            disabled={disabled}
            onClick={() =>
              void command({ domain: 'reset' }).then((ok) => {
                if (ok) setReset(false);
              })
            }
          >
            Đặt lại bài này
          </GameButton>
          <button className="soft-button" onClick={() => setReset(false)}>
            Giữ lại
          </button>
        </GameModal>
      )}
      {phase === 'saving' && (
        <GameModal title="Đang kiểm tra kết quả" onClose={() => {}}>
          <LoadingScreen label="Máy chủ kiểm tra điều kiện và lưu kết quả…" />
        </GameModal>
      )}
      {phase === 'result' && summary && (
        <GameModal
          title="Kết quả thực hành"
          onClose={() => {
            window.location.href = `/play/${lesson.module}`;
          }}
        >
          <div className="simulation-result">
            <Sprite
              atlas="12"
              name={summary.passed ? 'trophy_gold' : 'medal_bronze'}
            />
            <h2>
              {summary.passed
                ? 'Em đã làm được!'
                : 'Cùng xem lại các điều kiện nhé'}
            </h2>
            <StarCounter value={summary.stars} />
            <strong>{summary.score}/100</strong>
            <p>
              {summary.completedTargets}/{total} điều kiện đúng ·{' '}
              {Math.round(summary.accuracy * 100)}% chính xác
            </p>
            <p>{summary.passed ? 'Đạt' : 'Chưa đạt'} · Kết quả đã lưu</p>
            <button
              className="soft-button"
              onClick={() => window.location.reload()}
            >
              Luyện lại
            </button>
            {next && !assigned && (
              <Link
                className="soft-button"
                to={`/play/${lesson.module}/practice/${next.id}`}
              >
                Bài tiếp theo
              </Link>
            )}
            <Link className="soft-button" to={`/play/${lesson.module}`}>
              Về phân khu
            </Link>
          </div>
        </GameModal>
      )}
    </section>
  );
}
