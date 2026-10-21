import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Pause, Play, SpeakerHigh } from '@phosphor-icons/react';
import {
  CompositionGate,
  TypingRun,
  compareText,
  graphemes,
  editVietnamese,
  keyboardRows,
  physicalTargets,
  typingConfig,
  typingLessons,
  type InputMode,
  type InputMethod,
  type TypingConfig,
  type TypingEvent,
  type TypingSummary,
} from '@byte/shared';
import {
  ByteMascot,
  GameButton,
  GameModal,
  GameProgress,
  Sprite,
  StarCounter,
} from '../../components/ui';
import { useStudentData } from '../../features/student/StudentData';
import { useAudio } from '../../hooks/useAudio';
import { post } from '../../services/api';
import { VirtualKeyboard } from './VirtualKeyboard';
import { useTypingRoom } from './useTypingRoom';
import './typing.css';
import { FullscreenButton } from '../../components/game/FullscreenButton';
type Ticket = {
  id: string;
  startedAt: string;
  serverTime: number;
  roomSessionId: string | null;
  config: TypingConfig;
};
export function TypingGamePage() {
  const { lessonId } = useParams(),
    lesson = typingLessons.find((l) => l.id === lessonId);
  return lesson ? (
    <TypingLesson key={lesson.id} lessonId={lesson.id} />
  ) : (
    <p>Không tìm thấy bài học.</p>
  );
}
function TypingLesson({ lessonId }: { lessonId: string }) {
  const lesson = typingLessons.find((l) => l.id === lessonId)!,
    isVi = lesson.module === 'vietnamese';
  const { overview, refresh } = useStudentData(),
    { room, connected } = useTypingRoom(overview?.room ?? null);
  const assigned =
    !!room && !['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state);
  const [config, setConfig] = useState(typingConfig(lesson)),
    [phase, setPhase] = useState<
      'ready' | 'starting' | 'playing' | 'saving' | 'result'
    >('ready');
  const [mode, setMode] = useState<InputMode>('system'),
    [method, setMethod] = useState<InputMethod>('telex'),
    [name, setName] = useState('');
  const [value, setValue] = useState(config.initial ?? ''),
    [composition, setComposition] = useState(false),
    [paused, setPaused] = useState(false),
    [pauseBusy, setPauseBusy] = useState(false);
  const [error, setError] = useState(''),
    [summary, setSummary] = useState<TypingSummary | null>(null),
    [elapsed, setElapsed] = useState(0),
    [, render] = useState(0),
    [exit, setExit] = useState(false);
  const ticket = useRef<Ticket | null>(null),
    run = useRef(new TypingRun(config, lesson.completionRules.minAccuracy)),
    origin = useRef(0),
    gate = useRef(new CompositionGate()),
    input = useRef<HTMLTextAreaElement>(null),
    arena = useRef<HTMLDivElement>(null);
  const frozen = useRef(0),
    pausedAt = useRef<number | null>(null),
    busy = useRef(false),
    pauseFlight = useRef(false),
    submission = useRef<TypingEvent[] | null>(null),
    phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roomBlocked =
    !!ticket.current?.roomSessionId &&
    !!room &&
    (!connected || room.state !== 'PLAYING');
  const blocked = paused || roomBlocked || exit;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const { speak, message } = useAudio();
  const time = () => Math.max(0, performance.now() - origin.current);
  const activeDuration = () =>
    Math.max(
      0,
      (pausedAt.current ?? time()) -
        (run.current.first ?? pausedAt.current ?? time()) -
        frozen.current,
    );
  const redraw = () => render((n) => n + 1);
  const focus = () => {
    if (isVi) input.current?.focus();
    else arena.current?.focus();
  };
  async function start() {
    setPhase('starting');
    setError('');
    try {
      const t = await post<Ticket>('/typing/attempts', {
        lessonId,
        ...(config.personalName ? { name } : {}),
      });
      ticket.current = t;
      setConfig(t.config);
      run.current = new TypingRun(t.config, lesson.completionRules.minAccuracy);
      origin.current =
        performance.now() - (t.serverTime - Date.parse(t.startedAt));
      setValue(t.config.initial ?? '');
      run.current.input({ t: 0, type: 'mode', mode, method });
      setPhase('playing');
      requestAnimationFrame(focus);
    } catch (e) {
      setError(String(e));
      setPhase('ready');
    }
  }
  async function save() {
    if (!ticket.current || busy.current || gate.current.composing) return;
    busy.current = true;
    if (!submission.current) {
      run.current.input({ t: time(), type: 'finish' });
      submission.current = run.current.events.map((event) => ({ ...event }));
    }
    setPhase('saving');
    setError('');
    try {
      const s = await post<TypingSummary>(
        `/typing/attempts/${ticket.current.id}/result`,
        { events: submission.current },
      );
      setSummary(s);
      setPhase('result');
      refresh();
    } catch (e) {
      setError(String(e));
      setPhase('playing');
      setPaused(true);
    } finally {
      busy.current = false;
    }
  }
  const durationRef = useRef(activeDuration);
  durationRef.current = activeDuration;
  const saveRef = useRef(save);
  saveRef.current = save;
  async function pause(next: boolean) {
    if (
      !ticket.current ||
      busy.current ||
      pauseFlight.current ||
      phaseRef.current !== 'playing'
    )
      return;
    if (next) {
      blockedRef.current = true;
      setPaused(true);
      run.current.keyboard.clear();
      run.current.input({ t: time(), type: 'clear' });
    }
    pauseFlight.current = true;
    setPauseBusy(true);
    try {
      const response = await post<{ serverTime: number }>(
        `/attempts/${ticket.current.id}/pause`,
        { paused: next },
      );
      const aligned = Math.max(
        time(),
        response.serverTime - Date.parse(ticket.current.startedAt),
      );
      origin.current = performance.now() - aligned;
      setPaused(next);
      setError('');
      if (!next) requestAnimationFrame(focus);
    } catch (e) {
      setError(String(e));
      setPaused(true);
    } finally {
      pauseFlight.current = false;
      setPauseBusy(false);
    }
  }
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    if (
      phase === 'playing' &&
      ticket.current?.roomSessionId &&
      !submission.current &&
      connected &&
      room &&
      ['FINISHED', 'RESULT', 'LEADERBOARD'].includes(room.state)
    ) {
      if (gate.current.composing) {
        gate.current.end(run.current.value);
        setComposition(false);
        setValue(run.current.value);
      }
      void saveRef.current();
    }
  }, [room?.state, room, connected, phase]);
  useEffect(() => {
    if (ticket.current && room?.serverTime && room.state === 'PLAYING') {
      const aligned = Math.max(
        time(),
        room.serverTime - Date.parse(ticket.current.startedAt),
      );
      origin.current = performance.now() - aligned;
    }
  }, [room?.serverTime, room?.state]);
  useEffect(() => {
    if (phase !== 'playing') return;
    if (blocked) {
      if (pausedAt.current === null && run.current.first !== null)
        pausedAt.current = time();
      run.current.keyboard.clear();
      if (gate.current.composing) {
        gate.current.end(run.current.value);
        setComposition(false);
        setValue(run.current.value);
      }
    } else if (pausedAt.current !== null) {
      frozen.current += time() - pausedAt.current;
      pausedAt.current = null;
    }
  }, [blocked, phase]);
  useEffect(() => {
    const blur = () => {
      if (phaseRef.current === 'playing' && !blockedRef.current)
        void pauseRef.current(true);
    };
    const hide = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      if (blockedRef.current || run.current.first === null) return;
      const ms = durationRef.current();
      setElapsed(ms);
      if (config.seconds && ms >= config.seconds * 1000) void saveRef.current();
    }, 100);
    return () => clearInterval(timer);
  }, [phase, config.seconds]);
  function feed(event: TypingEvent) {
    run.current.input(event);
    redraw();
  }
  function commit(text: string) {
    const stable = gate.current.input(text);
    if (stable === null || blockedRef.current) return;
    const field = input.current;
    const selection =
      field?.value === text
        ? {
            start: text.slice(0, field.selectionStart).normalize('NFC').length,
            end: text.slice(0, field.selectionEnd).normalize('NFC').length,
          }
        : null;
    setValue(stable);
    feed({ t: time(), type: 'text', value: stable });
    if (selection)
      requestAnimationFrame(() => {
        if (document.activeElement === field && !gate.current.composing)
          field?.setSelectionRange(selection.start, selection.end);
      });
  }
  function switchMode(next: InputMode, nextMethod: InputMethod) {
    setMode(next);
    setMethod(nextMethod);
    if (phase === 'playing')
      feed({ t: time(), type: 'mode', mode: next, method: nextMethod });
  }
  const stats = run.current.summary(elapsed),
    targets = physicalTargets(config),
    nextCode = targets[run.current.cursor];
  const keyLabel = (code: string) =>
    keyboardRows.flat().find((k) => k.code === code)?.label ?? code;
  const diff = compareText(
    config.target,
    composition ? run.current.value : value,
  );
  const progress = isVi
    ? (diff.filter((c) => c.state === 'correct').length /
        graphemes(config.target).length) *
      100
    : (run.current.cursor / targets.length) * 100;
  const next = typingLessons.filter((l) => l.module === lesson.module)[
    typingLessons
      .filter((l) => l.module === lesson.module)
      .findIndex((l) => l.id === lessonId) + 1
  ];
  return (
    <section
      className={`typing-page ${isVi ? 'vietnamese-workshop' : 'keyboard-academy'}`}
    >
      <header className="typing-header">
        <button
          className="soft-button"
          onClick={() => {
            if (phase === 'playing') {
              setExit(true);
              void pause(true);
            } else window.location.href = `/play/${lesson.module}`;
          }}
        >
          <ArrowLeft size={20} /> Phân khu
        </button>
        <div>
          <span>
            {isVi ? 'XƯỞNG GÕ TIẾNG VIỆT' : 'HỌC VIỆN BÀN PHÍM'} ·{' '}
            {config.group}
          </span>
          <h1>{lesson.title}</h1>
        </div>
        <FullscreenButton />
        <button
          className="soft-button"
          disabled={phase !== 'playing'}
          onClick={() => void pause(true)}
        >
          <Pause size={20} /> Tạm dừng
        </button>
      </header>
      <div className="typing-toolbar">
        <button
          className="soft-button"
          onClick={() =>
            void speak(
              `${lessonId}-sample`,
              isVi ? config.target : lesson.instructions.join(' '),
            )
          }
        >
          <SpeakerHigh size={22} />
          {isVi ? 'Nghe đọc câu mẫu' : 'Nghe hướng dẫn'}
        </button>
        <p role="status">
          {message || 'Chậm một chút cũng được. Byte luôn ở đây cùng em!'}
        </p>
        <Sprite atlas="02" name="encouraging_smile" />
      </div>
      <div className="typing-stats" aria-label="Thống kê lượt luyện">
        <div>
          <strong>{stats.wpm}</strong>
          <span>WPM</span>
        </div>
        <div>
          <strong>{stats.cpm}</strong>
          <span>Ký tự / phút</span>
        </div>
        <div>
          <strong>{Math.round(stats.accuracy * 100)}%</strong>
          <span>Chính xác</span>
        </div>
        <div>
          <strong>{isVi ? stats.longestStreak : run.current.streak}</strong>
          <span>Chuỗi đúng</span>
        </div>
        <div>
          <strong>
            {config.seconds
              ? Math.max(0, Math.ceil(config.seconds - elapsed / 1000))
              : Math.floor(elapsed / 1000)}
            s
          </strong>
          <span>{config.seconds ? 'Còn lại' : 'Thời gian'}</span>
        </div>
      </div>
      {isVi && (
        <div className="input-settings">
          <label>
            Bộ gõ{' '}
            <select
              aria-label="Chế độ bộ gõ"
              disabled={
                composition ||
                blocked ||
                phase === 'saving' ||
                phase === 'result'
              }
              value={mode}
              onChange={(e) => switchMode(e.target.value as InputMode, method)}
            >
              <option value="system">A · Bộ gõ có sẵn trên máy</option>
              <option value="integrated">B · Bộ gõ thực hành tích hợp</option>
            </select>
          </label>
          <label>
            Phương pháp{' '}
            <select
              aria-label="Phương pháp gõ"
              value={method}
              disabled={
                composition ||
                blocked ||
                phase === 'saving' ||
                phase === 'result'
              }
              onChange={(e) => switchMode(mode, e.target.value as InputMethod)}
            >
              <option value="telex">Telex</option>
              <option value="vni">VNI</option>
            </select>
          </label>
          <p>
            {mode === 'system'
              ? 'Ứng dụng giữ nguyên chữ do bộ gõ máy tạo ra. Chọn Telex hoặc VNI trên máy của em.'
              : 'Bộ gõ tích hợp đang bật. Chuyển bộ gõ máy sang tiếng Anh (ENG) trước khi gõ.'}
          </p>
        </div>
      )}
      <div className="typing-stage">
        {isVi ? (
          <div className="workshop-scene">
            <Sprite
              atlas="11"
              name="classroom_plant"
              className="classroom-plant"
            />
            <div className="wooden-board">
              <span>CÂU MẪU CỦA EM</span>
              <p>
                {config.personalName && phase === 'ready'
                  ? 'Tên của em'
                  : config.target}
              </p>
            </div>
            <ByteMascot pose="thumbs_up" className="classroom-byte" />
            <div className="workshop-desk">
              <div className="writing-space">
                <label htmlFor="vietnamese-input">Trang viết của em</label>
                <textarea
                  id="vietnamese-input"
                  ref={input}
                  value={value}
                  disabled={phase !== 'playing' || blocked}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Em gõ ở đây…"
                  onPaste={(e) => {
                    e.preventDefault();
                    setError('Em hãy tự gõ từng chữ để luyện tập nhé.');
                  }}
                  onDrop={(e) => e.preventDefault()}
                  onCompositionStart={() => {
                    gate.current.start();
                    setComposition(true);
                  }}
                  onCompositionUpdate={() => gate.current.update()}
                  onCompositionEnd={(e) => {
                    const v = e.currentTarget.value;
                    gate.current.end(v);
                    setComposition(false);
                    if (!blockedRef.current) commit(v);
                    else setValue(run.current.value);
                  }}
                  onChange={(e) => {
                    if (gate.current.composing) {
                      setValue(e.target.value);
                      return;
                    }
                    commit(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      void pause(true);
                      return;
                    }
                    if (
                      mode !== 'integrated' ||
                      e.nativeEvent.isComposing ||
                      gate.current.composing ||
                      e.ctrlKey ||
                      e.altKey ||
                      e.metaKey ||
                      e.key.length !== 1
                    )
                      return;
                    e.preventDefault();
                    const el = e.currentTarget;
                    const edited = editVietnamese(
                      el.value,
                      el.selectionStart,
                      el.selectionEnd,
                      e.key,
                      method,
                    );
                    commit(edited.value);
                    requestAnimationFrame(() =>
                      el.setSelectionRange(edited.caret, edited.caret),
                    );
                  }}
                />
                <p className="composition-status" role="status">
                  {composition
                    ? 'Đang ghép dấu… Chưa chấm chữ.'
                    : 'Em có thể chọn chữ và sửa bằng Backspace hoặc Delete.'}
                </p>
                <div
                  className="text-comparison"
                  aria-label="So sánh chữ đã ổn định"
                >
                  {diff.map((c, i) => (
                    <span key={i} className={`char-${c.state}`}>
                      {c.text}
                    </span>
                  ))}
                </div>
              </div>
              <aside className="method-guide">
                <Sprite atlas="11" name="notebook_open" />
                <h2>{method === 'telex' ? 'Gõ Telex' : 'Gõ VNI'}</h2>
                <p>
                  {method === 'telex'
                    ? 'aa → â · aw → ă\nee → ê · oo → ô\now → ơ · uw → ư\ndd → đ'
                    : 'a6 → â · a8 → ă\ne6 → ê · o6 → ô\no7 → ơ · u7 → ư\nd9 → đ'}
                </p>
                <p>
                  {method === 'telex'
                    ? 's sắc · f huyền\nr hỏi · x ngã · j nặng\nz bỏ dấu thanh'
                    : '1 sắc · 2 huyền\n3 hỏi · 4 ngã · 5 nặng\n0 bỏ dấu thanh'}
                </p>
              </aside>
              <VirtualKeyboard compact held={new Set()} />
            </div>
          </div>
        ) : (
          <div
            className="keyboard-studio"
            ref={arena}
            tabIndex={phase === 'playing' ? 0 : -1}
            role="region"
            aria-label="Vùng luyện bàn phím vật lý"
            onBlur={(e) => {
              if (phase === 'playing' && !submission.current)
                run.current.input({ t: time(), type: 'clear' });
              else run.current.keyboard.clear();
              if (
                phase === 'playing' &&
                !(
                  e.relatedTarget instanceof Element &&
                  e.relatedTarget.closest('.typing-page')
                ) &&
                !blockedRef.current
              )
                void pause(true);
            }}
            onKeyDown={(e) => {
              if (phase !== 'playing' || blockedRef.current) return;
              if (e.key === 'Escape') {
                e.preventDefault();
                void pause(true);
                return;
              }
              if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab') return;
              e.preventDefault();
              feed({
                t: time(),
                type: 'down',
                code: e.code,
                key: e.key,
                repeat: e.repeat,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                metaKey: e.metaKey,
                isComposing: e.nativeEvent.isComposing,
              });
              if (
                run.current.summary(activeDuration()).passed &&
                run.current.cursor === targets.length
              )
                void save();
            }}
            onKeyUp={(e) => {
              if (phase === 'playing' && !blockedRef.current)
                feed({ t: time(), type: 'up', code: e.code });
            }}
          >
            <div className="sample-strip" aria-label="Dòng ký tự mẫu">
              {(config.mode === 'recognize'
                ? targets
                : graphemes(config.target)
              ).map((c, i) => (
                <span
                  className={
                    i < run.current.cursor
                      ? 'char-correct'
                      : i === run.current.cursor
                        ? 'current-char'
                        : ''
                  }
                  key={i}
                >
                  {config.mode === 'recognize'
                    ? keyLabel(c)
                    : c === ' '
                      ? '␣'
                      : c}
                </span>
              ))}
            </div>
            <div className="next-prompt">
              Phím tiếp theo <kbd>{keyLabel(nextCode ?? '')}</kbd>
              <span>
                {run.current.errors > 0
                  ? `Đã có ${run.current.errors} lần nhấn nhầm. Cứ thử tiếp nhé!`
                  : 'Thả lỏng vai, đặt nhẹ các ngón tay.'}
              </span>
            </div>
            <VirtualKeyboard next={nextCode} held={run.current.keyboard.held} />
          </div>
        )}
      </div>
      <div className="typing-bottom">
        <GameProgress
          value={progress}
          label={`Tiến độ ${Math.round(progress)}%`}
        />
        <span>
          {stats.errorCount} lỗi ·{' '}
          {phase === 'ready'
            ? 'Sẵn sàng khám phá'
            : composition
              ? 'Đang ghép chữ'
              : 'Mỗi chữ là một bước tiến'}
        </span>
        {phase === 'playing' && (
          <GameButton
            disabled={blocked || composition}
            onClick={() => void save()}
          >
            Nộp bài
          </GameButton>
        )}
      </div>
      {error && (
        <p className="typing-error" role="alert">
          {error}
        </p>
      )}
      {phase === 'ready' && (
        <div className="typing-ready">
          <ByteMascot pose="explaining" />
          <div>
            <h2>
              {isVi
                ? 'Cùng viết những điều thật đẹp'
                : 'Mười ngón tay, một hành trình mới'}
            </h2>
            <p>{lesson.instructions[0]}</p>
            <p>{lesson.instructions[1]}</p>
            {config.personalName && (
              <label>
                Tên để luyện gõ{' '}
                <input
                  aria-label="Tên để luyện gõ"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <p>
              {assigned
                ? connected
                  ? room.lessonId === lessonId
                    ? 'Bài học cùng thầy cô.'
                    : 'Hãy mở đúng bài của phòng học.'
                  : 'Đang kết nối phòng học…'
                : 'Tự luyện · Kết quả được lưu tại máy chủ'}
            </p>
            <GameButton
              disabled={
                (assigned &&
                  (!connected ||
                    room.state !== 'PLAYING' ||
                    room.lessonId !== lessonId)) ||
                (!!config.personalName && !name.trim())
              }
              onClick={() => void start()}
            >
              <Play size={22} /> Bắt đầu luyện tập
            </GameButton>
          </div>
        </div>
      )}
      {(phase === 'starting' || phase === 'saving') && (
        <p role="status">
          {phase === 'saving'
            ? 'Máy chủ đang kiểm tra và lưu kết quả…'
            : 'Đang mở bài học…'}
        </p>
      )}
      {exit && phase === 'playing' && (
        <GameModal
          title="Rời bài học?"
          onClose={() => {
            setExit(false);
            void pause(false);
          }}
        >
          <p>Lượt luyện này chưa được lưu. Em có thể quay lại để nộp bài.</p>
          <GameButton
            disabled={pauseBusy}
            onClick={() => {
              setExit(false);
              void pause(false);
            }}
          >
            Quay lại bài
          </GameButton>
          <Link className="soft-button" to={`/play/${lesson.module}`}>
            Rời bài học
          </Link>
        </GameModal>
      )}
      {blocked && !exit && phase === 'playing' && (
        <GameModal
          title="Nghỉ một chút nhé!"
          onClose={() => {
            if (!roomBlocked && !pauseBusy && !submission.current) {
              setExit(false);
              void pause(false);
            }
          }}
        >
          <ByteMascot pose="idle_front" className="pause-byte" />
          <p>
            {roomBlocked
              ? 'Đang chờ phòng học tiếp tục hoặc kết nối lại.'
              : 'Thời gian đang tạm dừng. Khi sẵn sàng, em hãy tiếp tục.'}
          </p>
          {!roomBlocked && !submission.current && (
            <GameButton
              disabled={pauseBusy}
              onClick={() => {
                setExit(false);
                void pause(false);
              }}
            >
              Tiếp tục
            </GameButton>
          )}
          <Link className="soft-button" to={`/play/${lesson.module}`}>
            Về phân khu
          </Link>
          {error && <p role="alert">{error}</p>}
          {error && submission.current && (
            <GameButton onClick={() => void save()}>
              Thử lưu lại kết quả
            </GameButton>
          )}
        </GameModal>
      )}
      {phase === 'result' && summary && (
        <GameModal
          title="Kết quả luyện tập"
          onClose={() => {
            window.location.href = `/play/${lesson.module}`;
          }}
        >
          <div className="typing-result">
            <Sprite
              atlas="12"
              name={isVi ? 'badge_vietnamese_typing' : 'badge_keyboard'}
            />
            <h2>
              {summary.passed
                ? 'Em đã làm được!'
                : 'Mỗi lần luyện là một lần tiến bộ'}
            </h2>
            <StarCounter value={summary.stars} />
            <strong>{summary.score}/100</strong>
            <p>
              Độ chính xác: {Math.round(summary.accuracy * 100)}% ·{' '}
              {summary.wpm} WPM · {summary.cpm} ký tự/phút
            </p>
            <p>
              {summary.errorCount} lỗi · Chuỗi đúng dài nhất:{' '}
              {summary.longestStreak} · {(summary.durationMs / 1000).toFixed(1)}{' '}
              giây
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
