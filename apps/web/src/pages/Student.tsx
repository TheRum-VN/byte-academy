import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GearSix,
  LockKey,
  UsersThree,
  SpeakerHigh,
  GraduationCap,
} from '@phosphor-icons/react';
import { modules, type Lesson } from '@byte/shared';
import {
  AudioControl,
  ByteMascot,
  GameBadge,
  GameButton,
  GameModal,
  GameProgress,
  LoadingScreen,
  Sprite,
  StarCounter,
} from '../components/ui';
import {
  GameInstructionBubble,
  GameLevelProgress,
  GameScorePanel,
  GameSkillSidebar,
  GameTimer,
  GameTopBar,
} from '../components/game/GameUI';
import { useModuleAssets } from '../hooks/useModuleAssets';
import { useAudio } from '../hooks/useAudio';
import { JoinRoom } from '../features/rooms/JoinRoom';
import { RoomPanel } from '../features/rooms/RoomPanel';
import {
  StudentDataProvider,
  useStudentData,
} from '../features/student/StudentData';
import {
  learningProgress,
  lessonStars,
  todayMissions,
} from '../features/student/learning';
import { usePreferences } from '../stores/preferences';
import { audioManager } from '../services/audio';

const skillArt: Record<
  string,
  { atlas: string; sprite: string; title: string }
> = {
  mouse: { atlas: '04', sprite: 'mouse_neutral', title: 'Thao tác chuột' },
  keyboard: {
    atlas: '08',
    sprite: 'keyboard_lavender_top',
    title: 'Gõ 10 ngón',
  },
  files: { atlas: '09', sprite: 'folder_open_gold', title: 'Tệp và thư mục' },
  vietnamese: { atlas: '11', sprite: 'notebook_open', title: 'Gõ chữ có dấu' },
  computer: {
    atlas: '03',
    sprite: 'desktop_monitor',
    title: 'Làm quen máy tính',
  },
  safety: { atlas: '15', sprite: 'shield_check', title: 'An toàn Internet' },
};
const cardTitles: Record<string, [string, string]> = {
  mouse: ['Vương quốc', 'Chuột'],
  keyboard: ['Học viện', 'Bàn phím'],
  files: ['Thành phố', 'Tệp tin'],
  vietnamese: ['Xưởng gõ', 'Tiếng Việt'],
};
export function StudentLayout() {
  return (
    <StudentDataProvider>
      <StudentShell />
    </StudentDataProvider>
  );
}
function StudentShell() {
  const { overview, error, loading, refresh } = useStudentData();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { volume, setVolume, muted } = usePreferences();
  const dialog =
    params.get('panel') ?? (params.has('join') ? 'classroom' : null);
  const stars =
    overview?.achievements.reduce((sum, a) => sum + a.stars, 0) ?? 0;
  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('panel');
    next.delete('join');
    setParams(next);
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    audioManager.stop();
  }, [location.pathname]);
  useEffect(() => {
    const open = () => setParams({ panel: 'classroom' });
    const dismiss = () => setParams({});
    window.addEventListener('byte:open-classroom', open);
    window.addEventListener('byte:close-classroom', dismiss);
    return () => {
      window.removeEventListener('byte:open-classroom', open);
      window.removeEventListener('byte:close-classroom', dismiss);
    };
  }, [setParams]);
  useEffect(() => () => audioManager.stop(), []);
  const navItems = [
    { to: '/play', title: 'Trang chủ', sprite: 'nav_home', end: true },
    { to: '/play/explore', title: 'Khám phá', sprite: 'nav_explore' },
    { to: '/play/missions', title: 'Nhiệm vụ', sprite: 'nav_missions' },
    {
      to: '/play/achievements',
      title: 'Thành tích',
      sprite: 'nav_achievements',
    },
  ];
  return (
    <div className="student-app">
      <header className="topbar">
        <Link
          className="brand"
          to="/play"
          aria-label="BYTE ACADEMY — Trang chủ"
        >
          <Sprite atlas="02" name="neutral_happy" className="brand-byte" />
          <span>
            <strong>BYTE ACADEMY</strong>
            <small>Học Tin học thật vui!</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng học sinh">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Sprite atlas="13" name={item.sprite} />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
        <div className="top-actions">
          <ClassroomButton />
          <Link
            to="/play/achievements"
            className="star-link"
            aria-label={
              error
                ? 'Sao chưa tải được'
                : loading
                  ? 'Đang tải sao'
                  : `Thành tích: ${stars} sao`
            }
          >
            {error || loading ? (
              <span>{error ? 'Sao chưa tải' : 'Đang tải sao…'}</span>
            ) : (
              <StarCounter value={stars} />
            )}
          </Link>
          <button
            className="student-profile"
            onClick={() => setParams({ panel: 'profile' })}
            aria-label="Hồ sơ học sinh"
          >
            <Sprite atlas="13" name="student_profile" />
            <span>
              {overview?.student?.name ?? 'Nhà thám hiểm'}
              <small>
                {overview?.classroom
                  ? `Lớp ${overview.classroom.grade}`
                  : 'Chưa vào lớp'}
              </small>
            </span>
          </button>
          <AudioControl />
          <button
            className="icon-button settings-button"
            aria-label="Cài đặt"
            onClick={() => setParams({ panel: 'settings' })}
          >
            <GearSix size={24} />
          </button>
        </div>
      </header>
      <main className="student-main">
        {error && (
          <div className="data-error" role="alert">
            <span>{error}</span>
            <button className="soft-button" onClick={refresh}>
              Thử lại
            </button>
          </div>
        )}
        <Outlet />
      </main>
      <footer className="student-footer">
        <span>BYTE ACADEMY · Mỗi ngày một khám phá mới</span>
        <Link to="/admin/login">
          <GraduationCap size={18} /> Không gian giáo viên
        </Link>
      </footer>
      {dialog === 'classroom' && (
        <GameModal title="Tham gia phòng học" onClose={close}>
          {overview?.room ? (
            <>
              <p>Xin chào {overview.student?.name}!</p>
              <RoomPanel initial={overview.room} />
              <details>
                <summary>Tham gia một phòng khác</summary>
                <JoinRoom />
              </details>
            </>
          ) : (
            <JoinRoom />
          )}
        </GameModal>
      )}
      {dialog === 'profile' && (
        <GameModal title="Nhà thám hiểm của Byte" onClose={close}>
          <div className="profile-summary">
            <Sprite atlas="13" name="student_profile" />
            <h3>{overview?.student?.name ?? 'Chào mừng em!'}</h3>
            <p>
              {overview?.classroom?.name ??
                'Tham gia phòng học để xem tên, lớp và kết quả của em.'}
            </p>
            {!error && !loading && <StarCounter value={stars} />}
          </div>
          <GameButton onClick={() => setParams({ panel: 'classroom' })}>
            <UsersThree size={20} />
            {overview?.room ? 'Xem phòng học' : 'Tham gia phòng học'}
          </GameButton>
        </GameModal>
      )}
      {dialog === 'settings' && (
        <GameModal title="Cài đặt của em" onClose={close}>
          <div className="form-stack">
            <div className="row">
              <span>Âm thanh hướng dẫn</span>
              <AudioControl />
            </div>
            <label>
              Âm lượng: {Math.round(volume * 100)}%
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  audioManager.configure(muted, next);
                }}
              />
            </label>
            <p>
              Byte chỉ đọc khi em bấm nghe. Giọng tiếng Việt tùy thuộc máy tính;
              hướng dẫn chữ luôn có sẵn.
            </p>
            <Link className="soft-button" to="/admin/login">
              <GraduationCap size={20} /> Không gian giáo viên
            </Link>
          </div>
        </GameModal>
      )}
    </div>
  );
}
function ClassroomButton() {
  const [, setParams] = useSearchParams();
  return (
    <button
      className="soft-button classroom-button"
      aria-label="Lớp học"
      onClick={() => setParams({ panel: 'classroom' })}
    >
      <UsersThree size={20} weight="fill" />
      <span className="classroom-label">Lớp học</span>
    </button>
  );
}
export function StudentHome() {
  const [, setParams] = useSearchParams();
  const { overview } = useStudentData();
  const { speak, message } = useAudio();
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <GameBadge>THẾ GIỚI MÁY TÍNH ĐANG CHỜ EM</GameBadge>
          <h1>
            Xin chào,
            <br className="hero-break" /> nhà thám hiểm nhỏ!
          </h1>
          <p>Hôm nay em muốn khám phá điều gì?</p>
          <div className="hero-actions">
            <GameButton onClick={() => setParams({ panel: 'classroom' })}>
              <UsersThree size={21} />
              {overview?.room ? 'Về phòng học của em' : 'Tham gia phòng học'}
            </GameButton>
            <button
              className="hero-listen"
              aria-label="Nghe Byte chào"
              onClick={() => void speak('welcome')}
            >
              <SpeakerHigh size={22} />
            </button>
          </div>
          {message && (
            <small className="audio-message" role="status">
              {message}
            </small>
          )}
        </div>
        <div className="hero-illustration">
          <Sprite atlas="12" name="star_gold" className="hero-star star-one" />
          <Sprite atlas="12" name="star_gold" className="hero-star star-two" />
          <ByteMascot animated className="hero-byte" />
          <span className="byte-name">BYTE · Bạn đồng hành của em</span>
        </div>
      </section>
      <ModuleCards />
      <div className="home-lower">
        <Missions compact />
        <section className="extra-discover">
          <div className="section-heading">
            <h2>Còn nhiều điều thú vị!</h2>
          </div>
          {modules.slice(4).map((m) => (
            <Link
              key={m.id}
              className={`extra-module ${m.color}`}
              to={`/play/${m.id}`}
            >
              <Sprite atlas={m.atlas} name={m.sprite} />
              <span>
                <strong>{m.title}</strong>
                <small>{m.description}</small>
              </span>
              <ArrowRight size={22} />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
function ModuleCards() {
  const { lessons, overview, loading, error } = useStudentData();
  return (
    <section className="journeys">
      <div className="section-heading">
        <div>
          <h2>Chọn hành trình của em</h2>
          <p>Một cú nháy chuột, mở ra cả thế giới!</p>
        </div>
        <span className="section-note">4 vùng đất · Thật nhiều khám phá</span>
      </div>
      <div className="module-grid">
        {modules.slice(0, 4).map((m, index) => {
          const progress = learningProgress(
            lessons.filter((l) => l.module === m.id),
            overview,
          );
          return (
            <Link
              key={m.id}
              className={`module-card ${m.color}`}
              to={`/play/${m.id}`}
            >
              <span className="module-number">HÀNH TRÌNH 0{index + 1}</span>
              <h3>
                {cardTitles[m.id]?.[0]}
                <br />
                {cardTitles[m.id]?.[1]}
              </h3>
              <Sprite
                atlas={m.atlas}
                name={m.sprite}
                className="module-art"
                alt={m.title}
              />
              <p>{m.description}</p>
              <span className="module-cta">
                {index === 1 || index === 3 ? 'Bắt đầu' : 'Khám phá ngay'}
                <ArrowRight size={18} weight="bold" />
              </span>
              <div className="card-progress">
                <span>
                  {loading
                    ? 'Đang tải tiến độ…'
                    : error
                      ? 'Chưa tải tiến độ'
                      : progress.status}
                </span>
                {!loading && !error && (
                  <>
                    <span>
                      {progress.completed}/{progress.total} bài
                    </span>
                    <progress
                      aria-label={`Tiến độ ${m.title}`}
                      max={Math.max(1, progress.total)}
                      value={progress.completed}
                    />
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
export function ExplorePage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <GameBadge>BẢN ĐỒ BYTE ACADEMY</GameBadge>
          <h1>Thế giới nhỏ, khám phá lớn</h1>
          <p>Chọn vùng đất em yêu thích và học theo nhịp của mình.</p>
        </div>
        <ByteMascot className="heading-byte" pose="point_left" />
      </div>
      <ModuleCards />
      <div className="explore-extras">
        {modules.slice(4).map((m) => (
          <Link
            key={m.id}
            className={`extra-module ${m.color}`}
            to={`/play/${m.id}`}
          >
            <Sprite atlas={m.atlas} name={m.sprite} />
            <span>{m.title}</span>
            <ArrowRight size={22} />
          </Link>
        ))}
      </div>
    </>
  );
}
export function Missions({ compact = false }: { compact?: boolean }) {
  const { lessons, overview, loading, error } = useStudentData();
  const missions = todayMissions(lessons, overview);
  const completed = missions.filter((l) =>
    overview?.todayCompletedLessonIds.includes(l.id),
  ).length;
  return (
    <section className={`missions-panel ${compact ? 'compact' : ''}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">MỖI NGÀY MỘT BƯỚC TIẾN</span>
          {compact ? <h2>Nhiệm vụ hôm nay</h2> : <h1>Nhiệm vụ hôm nay</h1>}
        </div>
        <Sprite atlas="13" name="nav_missions" className="section-sprite" />
      </div>
      {loading ? (
        <LoadingScreen label="Đang lấy nhiệm vụ…" />
      ) : error ? (
        <p>Danh sách nhiệm vụ sẽ xuất hiện khi kết nối lại.</p>
      ) : (
        <>
          <p className="mission-note">
            {overview?.room
              ? 'Bài của phòng học được ưu tiên đầu tiên.'
              : 'Các bài gợi ý từ hành trình học của em.'}{' '}
            {missions.every((l) => !l.available) &&
              'Bài luyện đang chờ mở; em có thể xem trước hướng dẫn.'}
          </p>
          <div className="mission-list">
            {missions.map((lesson) => {
              const done = overview?.todayCompletedLessonIds.includes(
                lesson.id,
              );
              const art = skillArt[lesson.module]!;
              return (
                <Link
                  to={`/play/${lesson.module}?lesson=${lesson.id}`}
                  key={lesson.id}
                  className="mission-row"
                >
                  <span className={`mission-check ${done ? 'done' : ''}`}>
                    {done ? (
                      <Check size={17} weight="bold" />
                    ) : (
                      <Sprite atlas={art.atlas} name={art.sprite} />
                    )}
                  </span>
                  <span>
                    <strong>{lesson.title}</strong>
                    <small>
                      {done
                        ? 'Đã hoàn thành hôm nay'
                        : lesson.available
                          ? 'Chưa hoàn thành'
                          : 'Chưa hoàn thành · Chờ mở'}
                    </small>
                  </span>
                  <span className="mission-reward">
                    <Sprite atlas="12" name="star_gold" />+
                    {lesson.rewards.reduce((s, r) => s + r.stars, 0)}
                    <small>sao thưởng</small>
                  </span>
                  <ArrowRight size={18} />
                </Link>
              );
            })}
          </div>
          {missions.length ? (
            <GameLevelProgress completed={completed} total={missions.length} />
          ) : (
            <p>Chưa có bài học trong hệ thống.</p>
          )}
        </>
      )}
      {compact && (
        <Link className="text-link" to="/play/missions">
          Xem nhiệm vụ của em <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}
export function AchievementsPage() {
  const { lessons, overview, loading, error } = useStudentData();
  const progress = learningProgress(lessons, overview);
  const stars = overview?.achievements.reduce((s, a) => s + a.stars, 0) ?? 0;
  return (
    <>
      <section className="achievement-hero">
        <Sprite atlas="12" name="trophy_gold" />
        <div>
          <GameBadge>TỪNG BƯỚC NHỎ, THÀNH TÍCH LỚN</GameBadge>
          <h1>Bộ sưu tập của em</h1>
          <p>Mỗi kỹ năng mới đều là một điều đáng tự hào.</p>
          {!loading && !error && <StarCounter value={stars} />}
        </div>
      </section>
      {loading ? (
        <LoadingScreen />
      ) : (
        !error && (
          <>
            <section className="journey-summary">
              <h2>Hành trình của em</h2>
              <GameProgress
                value={progress.percent}
                label={`${progress.completed}/${progress.total} bài đã hoàn thành`}
              />
              <p>
                {overview?.student
                  ? 'Kết quả được lưu cùng phiên học sinh của em.'
                  : 'Tham gia phòng học để xem kết quả của riêng em.'}
              </p>
            </section>
            <div className="badge-grid">
              {lessons.map((lesson) => {
                const earned = lessonStars(lesson, overview);
                return (
                  <section
                    className={`achievement-card ${earned ? 'earned' : ''}`}
                    key={lesson.id}
                  >
                    <Sprite
                      atlas="12"
                      name={
                        ['mouse', 'keyboard', 'files', 'vietnamese'].includes(
                          lesson.module,
                        )
                          ? `badge_${lesson.module === 'files' ? 'file_management' : lesson.module === 'vietnamese' ? 'vietnamese_typing' : lesson.module}`
                          : 'medal_lavender'
                      }
                    />
                    <h3>
                      {modules.find((m) => m.id === lesson.module)?.title}
                    </h3>
                    <p>
                      {earned
                        ? `Đã nhận ${earned} sao`
                        : 'Chưa đạt · Hoàn thành bài học để nhận'}
                    </p>
                    <Link className="text-link" to={`/play/${lesson.module}`}>
                      Xem hành trình <ArrowRight size={17} />
                    </Link>
                  </section>
                );
              })}
            </div>
          </>
        )
      )}
    </>
  );
}
export function ModulePage({ id }: { id: string }) {
  const preload = useModuleAssets(id);
  const { lessons, overview, loading, error } = useStudentData();
  const [grade, setGrade] = useState('all');
  const [lessonGroup, setLessonGroup] = useState('all');
  const [params, setParams] = useSearchParams();
  const m = modules.find((m) => m.id === id);
  useEffect(() => {
    setGrade('all');
    setLessonGroup('all');
  }, [id]);
  if (!m) return null;
  const moduleLessons = lessons.filter((l) => l.module === id);
  const visible = moduleLessons.filter(
    (l) =>
      (lessonGroup === 'all' || l.config.group === lessonGroup) &&
      (grade === 'all' ||
        (grade === 'lower'
          ? l.gradeMin <= 2 && l.gradeMax >= 1
          : l.gradeMin <= 5 && l.gradeMax >= 3)),
  );
  const progress = learningProgress(moduleLessons, overview);
  const selected = moduleLessons.find((l) => l.id === params.get('lesson'));
  const art = skillArt[id]!;
  return (
    <>
      <div className="module-breadcrumb">
        <Link to="/play" className="back-link">
          <ArrowLeft size={18} /> Về bản đồ khám phá
        </Link>
      </div>
      <section className={`module-intro ${m.color}`}>
        <div className="module-intro-copy">
          <GameBadge>{m.grades} · HỌC CÙNG BYTE</GameBadge>
          <h1>{m.title}</h1>
          <p>{m.description}</p>
          <div className="byte-introduction">
            <ByteMascot pose="explaining" />
            <p>
              “Mình là Byte! Cùng xem hướng dẫn, rồi khám phá từng kỹ năng nhé.”
            </p>
          </div>
        </div>
        <Sprite
          atlas={m.atlas}
          name={m.sprite}
          className="intro-art"
          alt={m.title}
        />
      </section>
      <div role="status" className="asset-progress">
        {preload.error ||
          (!preload.done
            ? `Đang chuẩn bị hình ảnh: ${preload.loaded}/${preload.total}`
            : 'Hình ảnh sẵn sàng cho hành trình của em.')}
      </div>
      <div className="lesson-toolbar">
        <div>
          <h2>Những bước khám phá</h2>
          <p>
            {!loading && !error
              ? `${progress.completed}/${progress.total} bài đã hoàn thành`
              : 'Tiến độ từ kết quả học tập của em'}
          </p>
        </div>
        <div className="grade-filter" role="group" aria-label="Lọc mức lớp">
          {[
            ['all', 'Tất cả'],
            ['lower', 'Lớp 1–2'],
            ['upper', 'Lớp 3–5'],
          ].map(([value, title]) => (
            <button
              key={value}
              aria-pressed={grade === value}
              onClick={() => setGrade(value!)}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      {!loading && !error && (
        <GameProgress value={progress.percent} label="Tiến độ phân khu" />
      )}
      {id === 'keyboard' && (
        <label className="typing-group-filter">
          Nhóm bài học
          <select
            value={lessonGroup}
            onChange={(e) => setLessonGroup(e.target.value)}
          >
            <option value="all">Tất cả các nhóm</option>
            {[...new Set(moduleLessons.map((l) => String(l.config.group)))].map(
              (group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ),
            )}
          </select>
        </label>
      )}
      {loading ? (
        <LoadingScreen />
      ) : (
        !error && (
          <div className="student-lesson-grid">
            {visible.map((lesson, index) => {
              const done = overview?.progress.some(
                (p) => p.lessonId === lesson.id && p.completedCount > 0,
              );
              return (
                <article key={lesson.id} className="student-lesson">
                  <div className={`lesson-icon ${m.color}`}>
                    <Sprite atlas={art.atlas} name={art.sprite} />
                  </div>
                  <div className="lesson-detail">
                    <div className="lesson-meta">
                      <span>
                        BÀI {String(index + 1).padStart(2, '0')} · LỚP{' '}
                        {lesson.gradeMin}–{lesson.gradeMax}
                      </span>
                      <span>
                        {
                          ['Khởi đầu', 'Tiến bộ', 'Thử thách'][
                            lesson.difficulty - 1
                          ]
                        }
                      </span>
                    </div>
                    <h3>{lesson.title}</h3>
                    {typeof lesson.config.group === 'string' && (
                      <small>{lesson.config.group}</small>
                    )}
                    <p>{lesson.instructions[0]}</p>
                    <div className="lesson-status">
                      {done ? (
                        <>
                          <Check size={17} /> Đã hoàn thành
                        </>
                      ) : lesson.available ? (
                        'Đã mở khóa'
                      ) : (
                        <>
                          <LockKey size={17} /> Đang phát triển · Chưa mở
                          gameplay
                        </>
                      )}
                      <StarCounter value={lessonStars(lesson, overview)} />
                    </div>
                  </div>
                  <button
                    className="soft-button"
                    onClick={() => setParams({ lesson: lesson.id })}
                  >
                    Xem bài học <ArrowRight size={18} />
                  </button>
                </article>
              );
            })}
            {!visible.length && (
              <div className="empty-lessons">
                <ByteMascot pose="thinking" />
                <h3>Chưa có bài phù hợp bộ lọc</h3>
                <button className="soft-button" onClick={() => setGrade('all')}>
                  Xem tất cả bài học
                </button>
              </div>
            )}
          </div>
        )
      )}
      {selected && (
        <LessonPreview lesson={selected} onClose={() => setParams({})} />
      )}
    </>
  );
}
function LessonPreview({
  lesson,
  onClose,
}: {
  lesson: Lesson;
  onClose: () => void;
}) {
  const { overview } = useStudentData();
  const navigate = useNavigate();
  const [step, setStep] = useState('0');
  const art = skillArt[lesson.module]!;
  const progress = overview?.progress.find((p) => p.lessonId === lesson.id);
  return (
    <GameModal
      title="Khám phá bài học"
      onClose={onClose}
      className="lesson-preview"
    >
      <GameTopBar
        title={lesson.title}
        stars={lessonStars(lesson, overview)}
        onBack={onClose}
      />
      <div className="preview-body">
        <GameSkillSidebar
          skills={lesson.instructions.map((_, index) => ({
            id: String(index),
            title: `Hướng dẫn ${index + 1}`,
            atlas: art.atlas,
            sprite: art.sprite,
          }))}
          activeId={step}
          onSelect={setStep}
        />
        <div className="preview-content">
          <GameInstructionBubble
            text={lesson.instructions[Number(step)] ?? ''}
            voiceId={`${lesson.id}-${step}`}
          />
          <div className="preview-byte">
            <ByteMascot pose="explaining" />
            <div>
              <GameBadge>{art.title}</GameBadge>
              <h3>Sẵn sàng cho khám phá mới?</h3>
              <p>
                {lesson.module === 'mouse'
                  ? 'Bài này cần dùng chuột vật lý để luyện đúng kỹ năng.'
                  : 'Đọc từng hướng dẫn cùng Byte và thầy cô nhé.'}
              </p>
            </div>
          </div>
          <GameScorePanel
            score={progress?.completedCount ? progress.bestScore : null}
            maxScore={lesson.scoringRules.maxScore}
            stars={lessonStars(lesson, overview)}
          />
          <GameTimer durationSeconds={lesson.timeLimit} />
          <p className="development">
            {lesson.available
              ? 'Bài học đã mở. Cùng Byte luyện tập ngay nhé!'
              : 'Đang phát triển · Chưa mở gameplay'}
          </p>
          <GameButton
            disabled={!lesson.available}
            onClick={() => {
              if (lesson.available)
                navigate(`/play/${lesson.module}/practice/${lesson.id}`);
              else {
                onClose();
                window.dispatchEvent(new Event('byte:open-classroom'));
              }
            }}
          >
            Vào bài học
          </GameButton>
        </div>
      </div>
    </GameModal>
  );
}
