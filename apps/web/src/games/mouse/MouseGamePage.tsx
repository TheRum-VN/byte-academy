import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ArrowsOut,
  ArrowsIn,
  Pause,
  Play,
  SpeakerHigh,
} from '@phosphor-icons/react';
import {
  mouseLessons,
  mouseSkills,
  mouseConfig,
  MouseRun,
  nextMouseLesson,
  wheelItems,
  type MouseAttemptTicket,
  type MouseInput,
  type MouseSummary,
  type RoomSnapshot,
} from '@byte/shared';
import {
  AudioControl,
  ByteMascot,
  GameButton,
  GameModal,
  LoadingScreen,
  Sprite,
  StarCounter,
} from '../../components/ui';
import { ConfirmExitModal } from '../../components/game/GameUI';
import { useStudentData } from '../../features/student/StudentData';
import { api, post } from '../../services/api';
import { roomSocket } from '../../services/socket';
import { audioManager } from '../../services/audio';
import { useAudio } from '../../hooks/useAudio';
import { usePreferences } from '../../stores/preferences';
import {
  createGameEngine,
  PersonalGameSession,
  type MouseEngine,
} from '../engine';
import './mouse.css';

function latestRoom(current: RoomSnapshot | null, incoming: RoomSnapshot) {
  return !current ||
    current.id !== incoming.id ||
    incoming.revision >= current.revision
    ? incoming
    : current;
}
export function MouseGamePage() {
  const { lessonId } = useParams();
  const lesson = mouseLessons.find((l) => l.id === lessonId);
  if (!lesson) return <p>Không tìm thấy bài luyện chuột.</p>;
  return <MouseLesson key={lesson.id} lessonId={lesson.id} />;
}
function MouseLesson({ lessonId }: { lessonId: string }) {
  const lesson = mouseLessons.find((l) => l.id === lessonId)!;
  const config = mouseConfig(lesson);
  const navigate = useNavigate();
  const { overview, refresh } = useStudentData();
  const [room, setRoom] = useState<RoomSnapshot | null>(overview?.room ?? null);
  const [connected, setConnected] = useState(!overview?.room);
  const assigned =
    !!room && !['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state);
  const [phase, setPhase] = useState<
    | 'instructions'
    | 'countdown'
    | 'loading'
    | 'playing'
    | 'saving'
    | 'result'
    | 'error'
  >('instructions');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [countdown, setCountdown] = useState(3);
  const [ticket, setTicket] = useState<MouseAttemptTicket | null>(null);
  const [summary, setSummary] = useState<MouseSummary | null>(null);
  const [view, setView] = useState({
    completed: 0,
    score: 0,
    stars: 0,
    feedback: lesson.instructions[0]!,
    wheelGoal: '',
  });
  const [doubleClickMs, setDoubleClickMs] = useState(650);
  const [localPaused, setLocalPaused] = useState(false);
  const [busyPause, setBusyPause] = useState(false);
  const [error, setError] = useState('');
  const [exit, setExit] = useState(false);
  const [destination, setDestination] = useState('/play/mouse');
  const parent = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLElement>(null);
  const canvasArea = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [screenMessage, setScreenMessage] = useState('');
  const engine = useRef<MouseEngine | null>(null);
  const lifecycle = useRef(
    new PersonalGameSession(lesson, assigned ? 'assigned' : 'free'),
  );
  const started = useRef(0);
  const submitted = useRef(false);
  const completeLog = useRef<MouseInput[]>([]);
  const mounted = useRef(true);
  const { speak, message } = useAudio();
  const roomPaused =
    !!room && !!ticket && (room.state !== 'PLAYING' || !connected);
  const paused = localPaused || roomPaused || exit;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const saveRef = useRef<(events: MouseInput[]) => void>(() => {});
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () => {
      const area = canvasArea.current;
      if (area?.clientWidth && area.clientHeight)
        setCanvasScale(
          Math.min(area.clientWidth / 960, area.clientHeight / 560),
        );
    };
    const observer = new ResizeObserver(resize);
    if (canvasArea.current) observer.observe(canvasArea.current);
    resize();
    const changed = () => setFullscreen(document.fullscreenElement === element);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', changed);
    };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (viewport.current?.requestFullscreen)
        await viewport.current.requestFullscreen();
      else
        setScreenMessage(
          'Trình duyệt chưa hỗ trợ nút toàn màn hình. Em có thể dùng phím F11.',
        );
    } catch {
      setScreenMessage('Chưa bật được toàn màn hình. Em có thể dùng phím F11.');
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audioManager.stop();
    };
  }, []);
  useEffect(() => {
    if (lifecycle.current.state === 'IDLE')
      lifecycle.current.transition('INSTRUCTIONS');
  }, []);
  useEffect(() => {
    if (overview?.room) {
      const snapshot = overview.room;
      setRoom((current) => latestRoom(current, snapshot));
    }
  }, [overview?.room]);
  useEffect(() => {
    if (!room?.code) return;
    const code = room.code;
    const socket = roomSocket();
    socket.on('connect', () => {
      socket.emit('room:subscribe', { code }, (result) => {
        if (result.ok)
          void api<RoomSnapshot>(`/rooms/${code}`)
            .then((snapshot) => {
              if (mounted.current) {
                setRoom((current) => latestRoom(current, snapshot));
                setConnected(true);
              }
            })
            .catch(() => setConnected(false));
        else setConnected(false);
      });
    });
    socket.on('room:snapshot', (snapshot) => {
      if (snapshot.code === code)
        setRoom((current) => latestRoom(current, snapshot));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [room?.code]);
  useEffect(() => {
    engine.current?.setPaused(paused);
    if (phaseRef.current === 'playing') {
      if (paused && lifecycle.current.state === 'PLAYING')
        lifecycle.current.transition('PAUSED');
      if (!paused && lifecycle.current.state === 'PAUSED')
        lifecycle.current.transition('PLAYING');
    }
  }, [paused, phase]);
  const setPause = useCallback(
    async (value: boolean) => {
      if (!ticket || busyPause) return;
      if (value) {
        engine.current?.setPaused(true);
        setLocalPaused(true);
      }
      setBusyPause(true);
      audioManager.stop();
      try {
        await post(`/attempts/${ticket.id}/pause`, { paused: value });
        setLocalPaused(value);
        setError('');
      } catch (e) {
        setError(String(e));
        setLocalPaused(true);
      } finally {
        setBusyPause(false);
      }
    },
    [ticket, busyPause],
  );
  const pauseRef = useRef(setPause);
  pauseRef.current = setPause;
  useEffect(() => {
    const blur = () => {
      if (phaseRef.current === 'playing' && !pausedRef.current)
        void pauseRef.current(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        phaseRef.current === 'playing' &&
        !pausedRef.current
      )
        void pauseRef.current(true);
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  const save = useCallback(
    async (events: MouseInput[]) => {
      if (!ticket || submitted.current) return;
      submitted.current = true;
      completeLog.current = events;
      setPhase('saving');
      engine.current?.setPaused(true);
      try {
        const result = await post<MouseSummary>(
          `/attempts/${ticket.id}/result`,
          { events },
        );
        if (!mounted.current) return;
        setSummary(result);
        setPhase('result');
        setError('');
        refresh();
        if (lifecycle.current.state === 'PAUSED')
          lifecycle.current.transition('PLAYING');
        if (lifecycle.current.state === 'PLAYING')
          lifecycle.current.transition(result.passed ? 'COMPLETED' : 'FAILED');
        lifecycle.current.transition('RESULT');
      } catch (e) {
        if (mounted.current) {
          setError(String(e));
          setPhase('error');
          submitted.current = false;
        }
      }
    },
    [ticket, refresh],
  );
  saveRef.current = (events) => {
    void save(events);
  };
  useEffect(() => {
    if (
      ticket &&
      room &&
      ['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state) &&
      phaseRef.current === 'playing'
    )
      saveRef.current(engine.current?.events ?? []);
  }, [room, ticket, phase]);
  useEffect(() => {
    if (!ticket || !parent.current) return;
    let active = true;
    void createGameEngine(parent.current, lesson, {
      ticket,
      elapsed: () => performance.now() - started.current,
      onUpdate: (run: MouseRun) => {
        if (!active) return;
        const result = run.summary(performance.now() - started.current);
        const goal = run.wheelGoal;
        setView({
          completed: run.completedTargets,
          score: result.score,
          stars: result.stars,
          feedback: run.feedback || lesson.instructions[0]!,
          wheelGoal:
            config.skill === 'wheel' && !run.complete
              ? `${run.completedTargets + 1}/3 · Cuộn ${goal.direction === 'down' ? 'xuống' : 'lên'} tìm ${wheelItems[goal.item]!.name}`
              : '',
        });
      },
      onComplete: (events) => {
        if (active) saveRef.current(events);
      },
      onError: (message) => {
        if (active) {
          setError(message);
          setPhase('error');
        }
      },
      onSuccess: () => {
        const pref = usePreferences.getState();
        if (!pref.muted)
          void audioManager.play('mouse-success', 'Đúng rồi! Em làm tốt lắm!');
      },
    })
      .then((instance) => {
        if (!active) {
          instance.destroy();
          return;
        }
        engine.current = instance;
        instance.setPaused(pausedRef.current);
        setPhase('playing');
      })
      .catch((e) => {
        if (active) {
          setError(String(e));
          setPhase('error');
        }
      });
    return () => {
      active = false;
      engine.current?.destroy();
      engine.current = null;
    };
  }, [ticket, lesson, config.skill]);
  const start = async () => {
    setError('');
    lifecycle.current.transition('READY');
    lifecycle.current.transition('COUNTDOWN');
    setCountdown(3);
    setPhase('countdown');
    for (let n = 3; n > 0; n--) {
      setCountdown(n);
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (!mounted.current) return;
    }
    setPhase('loading');
    try {
      const created = await post<MouseAttemptTicket>('/attempts', {
        lessonId,
        doubleClickMs,
      });
      if (!mounted.current) return;
      started.current = performance.now();
      lifecycle.current.transition('PLAYING');
      setTicket(created);
    } catch (e) {
      if (mounted.current) {
        setError(String(e));
        setPhase('instructions');
        lifecycle.current = new PersonalGameSession(
          lesson,
          assigned ? 'assigned' : 'free',
        );
        lifecycle.current.transition('INSTRUCTIONS');
      }
    }
  };
  const leave = (to: string) => {
    if (phase === 'playing') {
      setDestination(to);
      setExit(true);
      void setPause(true);
    } else navigate(to);
  };
  const canStart =
    !overview?.room ||
    (connected &&
      room &&
      (['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state) ||
        (room.state === 'PLAYING' && room.lessonId === lessonId)));
  const next = nextMouseLesson(lessonId);
  return (
    <section
      className="mouse-game-page"
      ref={viewport}
      aria-label="Trò chơi Vương quốc Chuột"
    >
      <div className="mouse-stage">
        <div className="mouse-landscape" aria-hidden="true">
          <div className="mouse-hill mouse-hill-far" />
          <div className="mouse-hill mouse-hill-near" />
          <Sprite atlas="05" name="tree_tall" className="garden-tree-left" />
          <Sprite atlas="05" name="tree_medium" className="garden-tree-right" />
          <Sprite
            atlas="05"
            name="mushroom_red"
            className="garden-mushroom-left"
          />
          <Sprite
            atlas="05"
            name="mushroom_lavender"
            className="garden-mushroom-small"
          />
          <Sprite
            atlas="05"
            name="flower_bush_pink"
            className="garden-flowers-left"
          />
        </div>
        <header className="mouse-topbar">
          <button className="mouse-back" onClick={() => leave('/play/mouse')}>
            <ArrowLeft size={26} weight="bold" />
            Quay lại
          </button>
          <h1>Thử thách Chuột</h1>
          <div
            className="mouse-top-score"
            aria-label={`Điểm: ${summary?.score ?? view.score}/100`}
          >
            <Sprite atlas="12" name="star_gold" />
            <span>
              <small>Điểm</small>
              <strong>
                {summary?.score ?? view.score}
                <small>/100</small>
              </strong>
            </span>
          </div>
          <div className="mouse-target-count">
            <Sprite atlas="05" name="star_gold_large" />
            <span>
              {summary?.completedTargets ?? view.completed}/{config.count} mục
              tiêu
            </span>
          </div>
          <button
            className="mouse-header-button"
            aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <ArrowsIn size={23} /> : <ArrowsOut size={23} />}
          </button>
          {phase === 'playing' && (
            <button
              className="mouse-header-button"
              aria-label="Tạm dừng"
              onClick={() => void setPause(true)}
            >
              <Pause size={24} weight="fill" />
            </button>
          )}
        </header>
        <div className="mouse-layout">
          <nav className="mouse-sidebar" aria-label="Sáu kỹ năng chuột">
            <div className="mouse-sidebar-title">VƯƠNG QUỐC CHUỘT</div>
            {mouseSkills.map((skill) => (
              <button
                key={skill.id}
                aria-pressed={config.skill === skill.id}
                disabled={assigned}
                onClick={() =>
                  leave(`/play/mouse/practice/mouse-${skill.id}-1`)
                }
              >
                <Sprite atlas="04" name={skill.sprite} />
                <span>{skill.title}</span>
              </button>
            ))}
            <div className="mouse-sidebar-bottom">
              <label>
                Cấp độ
                <select
                  aria-label="Chọn cấp độ"
                  disabled={assigned || phase !== 'instructions'}
                  value={config.level}
                  onChange={(e) =>
                    navigate(
                      `/play/mouse/practice/mouse-${config.skill}-${e.target.value}`,
                    )
                  }
                >
                  <option value="1">Cấp 1</option>
                  <option value="2">Cấp 2</option>
                </select>
              </label>
              <AudioControl />
            </div>
            <span className="mouse-no-rush">Cứ từ từ, em sẽ làm được!</span>
          </nav>
          <div className="mouse-main">
            <div className="mouse-instruction">
              <button
                className="icon-button"
                aria-label="Nghe hướng dẫn"
                onClick={() => void speak(lessonId, lesson.instructions[0])}
              >
                <SpeakerHigh size={26} />
              </button>
              <p>
                {config.skill === 'drag'
                  ? 'Kéo các ngôi sao vào giỏ nhé!'
                  : config.skill === 'left'
                    ? 'Click trái vào bong bóng có viền vàng nhé!'
                    : config.skill === 'right'
                      ? 'Click phải vào rương có viền vàng nhé!'
                      : config.skill === 'double'
                        ? 'Nháy đúp để mở chiếc rương nhé!'
                        : config.skill === 'middle'
                          ? 'Nhấn nút giữa để mở cổng nhé!'
                          : view.wheelGoal || 'Cuộn chuột để tìm vật phẩm nhé!'}
              </p>
            </div>
            {(message || screenMessage) && (
              <small className="mouse-audio-message" role="status">
                {message || screenMessage}
              </small>
            )}
            {room && (
              <p className="mouse-room">
                Phòng {room.code} ·{' '}
                {connected
                  ? room.state === 'PLAYING'
                    ? 'Đang học cùng thầy cô'
                    : room.state === 'PAUSED'
                      ? 'Thầy cô đang tạm dừng'
                      : 'Chờ lệnh từ thầy cô'
                  : 'Đang nối lại máy chủ…'}
              </p>
            )}
            {phase === 'instructions' && (
              <div className="mouse-start">
                <ByteMascot pose="explaining" />
                <div>
                  <span className="mouse-lesson-caption">{lesson.title}</span>
                  <h2>
                    {config.skill === 'drag'
                      ? `Cùng thu thập ${config.count} ngôi sao!`
                      : 'Em đã sẵn sàng chưa?'}
                  </h2>
                  <p>{lesson.instructions[0]}</p>
                  <small>
                    Không giới hạn thời gian · Hoàn thành {config.count} mục
                    tiêu, chính xác từ 60%.
                  </small>
                  {config.skill === 'double' && (
                    <label>
                      Khoảng nháy đúp tối đa
                      <select
                        aria-label="Khoảng nháy đúp"
                        value={doubleClickMs}
                        onChange={(e) =>
                          setDoubleClickMs(Number(e.target.value))
                        }
                      >
                        <option value={450}>450 ms</option>
                        <option value={650}>650 ms</option>
                        <option value={900}>900 ms · Dễ hơn</option>
                      </select>
                    </label>
                  )}
                  <GameButton disabled={!canStart} onClick={() => void start()}>
                    <Play size={22} />{' '}
                    {canStart ? 'Bắt đầu luyện tập' : 'Chờ thầy cô bắt đầu'}
                  </GameButton>
                </div>
              </div>
            )}
            {phase === 'countdown' && (
              <div className="mouse-countdown" role="status">
                Chuẩn bị… <strong>{countdown}</strong>
              </div>
            )}
            {phase === 'loading' && (
              <LoadingScreen label="Đang chuẩn bị khu vườn…" />
            )}
            <div
              className="mouse-canvas-scroll"
              aria-label="Khu vườn luyện chuột"
              ref={canvasArea}
              hidden={!ticket}
            >
              <div
                className="mouse-canvas"
                ref={parent}
                style={{
                  transform: `translate(-50%, -50%) scale(${canvasScale})`,
                }}
              />
            </div>
            {phase === 'playing' && (
              <p className="mouse-feedback" role="status">
                <span>
                  {view.feedback !== lesson.instructions[0]
                    ? view.feedback
                    : `Nhiệm vụ: ${mouseSkills.find((s) => s.id === config.skill)!.title}`}
                </span>
                <span
                  className="mouse-progress-track"
                  role="progressbar"
                  aria-label="Tiến độ bài luyện chuột"
                  aria-valuenow={view.completed}
                  aria-valuemin={0}
                  aria-valuemax={config.count}
                >
                  <span
                    style={{
                      width: `${(view.completed / config.count) * 100}%`,
                    }}
                  />
                </span>
              </p>
            )}
            {error && (
              <p className="mouse-error" role="alert">
                {error}
              </p>
            )}
            {phase === 'error' && (
              <div className="modal-actions mouse-error-actions">
                {completeLog.current.length > 0 && (
                  <GameButton onClick={() => void save(completeLog.current)}>
                    Thử lưu lại kết quả
                  </GameButton>
                )}
                <button
                  className="soft-button"
                  onClick={() => window.location.reload()}
                >
                  Chơi lại
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mouse-portrait-hint">
        Xoay ngang màn hình để chơi thoải mái hơn. Dùng chuột để luyện tập.
      </p>
      {phase === 'saving' && (
        <GameModal title="Đang kiểm tra kết quả" onClose={() => {}}>
          <LoadingScreen label="Máy chủ đang kiểm tra thao tác và lưu kết quả…" />
        </GameModal>
      )}
      {phase === 'result' && summary && (
        <GameModal
          title="Kết quả luyện tập"
          onClose={() => navigate('/play/mouse')}
        >
          <div className="mouse-result">
            <ByteMascot
              pose={summary.passed ? 'celebrate_victory' : 'explaining'}
            />
            <h2>
              {summary.passed
                ? 'Em đã làm được!'
                : 'Cùng luyện thêm một chút nhé!'}
            </h2>
            <StarCounter value={summary.stars} />
            <strong className="mouse-result-score">{summary.score}/100</strong>
            <p>
              Độ chính xác: {Math.round(summary.accuracy * 100)}% ·{' '}
              {summary.completedTargets}/{config.count} mục tiêu
            </p>
            <p>
              {summary.correctActions} thao tác đúng · {summary.wrongActions}{' '}
              thao tác cần luyện lại
            </p>
            <p>{summary.passed ? 'Đạt' : 'Chưa đạt'} · Kết quả đã lưu</p>
            <div className="modal-actions">
              <GameButton onClick={() => window.location.reload()}>
                Chơi lại
              </GameButton>
              {next && !assigned && (
                <GameButton
                  onClick={() => navigate(`/play/mouse/practice/${next.id}`)}
                >
                  Bài tiếp theo
                </GameButton>
              )}
              <button
                className="soft-button"
                onClick={() => navigate('/play/mouse')}
              >
                Về phân khu
              </button>
            </div>
          </div>
        </GameModal>
      )}
      {paused && phase === 'playing' && !exit && (
        <GameModal
          title={
            roomPaused ? 'Chờ thầy cô một chút nhé!' : 'Nghỉ một chút nhé!'
          }
          onClose={() => {
            if (!roomPaused) void setPause(false);
          }}
        >
          <div className="mouse-pause">
            <ByteMascot pose="idle_front" />
            <p>
              {roomPaused
                ? connected
                  ? 'Bài học sẽ tiếp tục theo điều khiển của giáo viên.'
                  : 'Đang nối lại phòng học. Thao tác được tạm dừng.'
                : 'Khi sẵn sàng, em hãy tiếp tục.'}
            </p>
            {!roomPaused && (
              <GameButton
                disabled={busyPause}
                onClick={() => void setPause(false)}
              >
                <Play size={22} />
                Tiếp tục
              </GameButton>
            )}
            <button
              className="soft-button"
              onClick={() => navigate('/play/mouse')}
            >
              Về phân khu
            </button>
          </div>
        </GameModal>
      )}
      {exit && (
        <ConfirmExitModal
          onCancel={() => {
            setExit(false);
            void setPause(false);
          }}
          onConfirm={() => navigate(destination)}
        />
      )}
    </section>
  );
}
