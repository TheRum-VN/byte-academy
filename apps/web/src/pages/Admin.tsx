import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router';
import {
  House,
  UsersThree,
  DoorOpen,
  Books,
  ChartBar,
  SignOut,
  ArrowRight,
} from '@phosphor-icons/react';
import type { Lesson, RoomSnapshot } from '@byte/shared';
import { api, post } from '../services/api';
import {
  ByteMascot,
  GameBadge,
  GameButton,
  GameCard,
  LessonCard,
  LoadingScreen,
  PageHeader,
} from '../components/ui';
import { RoomPanel } from '../features/rooms/RoomPanel';
interface Teacher {
  id: string;
  name: string;
}
interface Classroom {
  id: string;
  name: string;
  grade: number;
  students: { id: string; name: string }[];
}
export function AdminLogin() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      await post<Teacher>('/auth/login', Object.fromEntries(data));
      navigate('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <Link to="/play" className="back-link">
        ← Về không gian học sinh
      </Link>
      <div className="login-grid">
        <section>
          <GameBadge>KHÔNG GIAN GIÁO VIÊN</GameBadge>
          <h1>
            Cùng thầy cô,
            <br />
            mở những hành trình mới.
          </h1>
          <p>Quản lý lớp học và kết nối học sinh trong phòng máy.</p>
          <ByteMascot className="login-byte" />
        </section>
        <GameCard>
          <h2>Chào mừng thầy cô!</h2>
          <p>Đăng nhập để chuẩn bị phòng học.</p>
          <form onSubmit={submit} className="form-stack">
            <label>
              Tên đăng nhập
              <input
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={40}
              />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <GameButton disabled={busy} type="submit">
              {busy ? 'Đang đăng nhập…' : 'Vào không gian giáo viên'}
              <ArrowRight size={20} />
            </GameButton>
          </form>
          <p className="setup-note">
            Tài khoản đầu tiên được tạo bởi người quản trị máy chủ theo hướng
            dẫn README.
          </p>
        </GameCard>
      </div>
    </main>
  );
}
export function AdminLayout() {
  const [teacher, setTeacher] = useState<Teacher | null>();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    api<Teacher>('/auth/me')
      .then(setTeacher)
      .catch(() => setTeacher(null));
  }, []);
  async function logout() {
    try {
      await post('/auth/logout', {});
      navigate('/admin/login');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (teacher === undefined) return <LoadingScreen />;
  if (!teacher) return <Navigate to="/admin/login" replace />;
  const links = [
    ['/admin', 'Tổng quan', House],
    ['/admin/classes', 'Lớp học', UsersThree],
    ['/admin/rooms', 'Phòng học', DoorOpen],
    ['/admin/lessons', 'Thư viện bài học', Books],
    ['/admin/reports', 'Kết quả học tập', ChartBar],
  ] as const;
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link to="/play" className="brand">
          <ByteMascot className="admin-logo" />
          <span>
            <strong>BYTE ACADEMY</strong>
            <small>Không gian giáo viên</small>
          </span>
        </Link>
        <nav aria-label="Quản trị">
          {links.map(([url, label, Icon]) => (
            <NavLink key={url} to={url} end={url === '/admin'}>
              <Icon size={23} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Xin chào, <strong>{teacher.name}</strong>
          </p>
          <button onClick={logout}>
            <SignOut size={20} />
            Đăng xuất
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
export function AdminOverview() {
  const [data, setData] = useState<{
    classes: Classroom[];
    rooms: RoomSnapshot[];
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Classroom[]>('/classes'), api<RoomSnapshot[]>('/rooms')])
      .then(([classes, rooms]) => setData({ classes, rooms }))
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <>
      <PageHeader
        title="Một buổi học đầy khám phá"
        subtitle="Chuẩn bị lớp và mở phòng học cho các em."
      />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="stats-grid">
            <GameCard>
              <p>Lớp học của thầy cô</p>
              <strong>{data.classes.length}</strong>
            </GameCard>
            <GameCard>
              <p>Học sinh trong danh sách</p>
              <strong>
                {data.classes.reduce((n, c) => n + c.students.length, 0)}
              </strong>
            </GameCard>
            <GameCard>
              <p>Phòng học đã tạo</p>
              <strong>{data.rooms.length}</strong>
            </GameCard>
          </div>
          <section className="teacher-welcome">
            <div>
              <GameBadge>BẮT ĐẦU TỪ NHỮNG ĐIỀU NHỎ</GameBadge>
              <h2>Sẵn sàng đón các nhà thám hiểm?</h2>
              <p>
                Tạo phòng, gửi mã cho học sinh và cùng theo dõi phòng chờ trực
                tiếp.
              </p>
              <Link className="primary-link" to="/admin/rooms">
                Chuẩn bị phòng học
                <ArrowRight size={20} />
              </Link>
            </div>
            <ByteMascot />
          </section>
          <GameCard>
            <h3>Nền tảng Milestone 01</h3>
            <p>
              Quản lý lớp, danh sách học sinh, đăng nhập và tạo/tham gia phòng
              đã hoạt động. Gameplay và bảng điều khiển tiết học sẽ được hoàn
              thiện ở các milestone sau.
            </p>
          </GameCard>
        </>
      )}
    </>
  );
}
export function AdminClasses() {
  const [classes, setClasses] = useState<Classroom[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api<Classroom[]>('/classes').then(setClasses);
  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await post('/classes', {
        name: data.get('name'),
        grade: Number(data.get('grade')),
      });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addStudent(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await post(`/classes/${id}/students`, { name: data.get('name') });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        title="Lớp học của thầy cô"
        subtitle="Chỉ lưu tên học sinh; không yêu cầu email."
      />
      <GameCard>
        <form className="inline-form" onSubmit={create}>
          <label>
            Tên lớp
            <input
              name="name"
              placeholder="Ví dụ: Lớp 3A"
              required
              maxLength={80}
            />
          </label>
          <label>
            Khối
            <select name="grade">
              {[1, 2, 3, 4, 5].map((g) => (
                <option value={g} key={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </label>
          <GameButton disabled={busy}>Tạo lớp</GameButton>
        </form>
      </GameCard>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="class-grid">
        {classes?.map((c) => (
          <GameCard key={c.id}>
            <div className="row">
              <h2>{c.name}</h2>
              <GameBadge>Khối {c.grade}</GameBadge>
            </div>
            <p>{c.students.length} học sinh</p>
            {c.students.length > 0 ? (
              <ul className="student-list">
                {c.students.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            ) : (
              <p>Chưa có học sinh trong danh sách.</p>
            )}
            <form
              onSubmit={(e) => void addStudent(e, c.id)}
              className="inline-form"
            >
              <label>
                Tên học sinh
                <input name="name" required maxLength={60} />
              </label>
              <GameButton>Thêm</GameButton>
            </form>
          </GameCard>
        ))}
      </div>
      {classes?.length === 0 && (
        <p className="empty-state">
          Chưa có lớp học. Tạo lớp đầu tiên ở phía trên.
        </p>
      )}
    </>
  );
}
export function AdminRooms() {
  const [rooms, setRooms] = useState<RoomSnapshot[]>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      api<RoomSnapshot[]>('/rooms'),
      api<Lesson[]>('/lessons'),
      api<Classroom[]>('/classes'),
    ])
      .then(([r, l, c]) => {
        setRooms(r);
        setLessons(l);
        setClasses(c);
      })
      .catch((e) => setError(String(e)));
  }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const room = await post<RoomSnapshot>('/rooms', {
        name: data.get('name'),
        lessonId: data.get('lessonId'),
        classroomId: data.get('classroomId') || undefined,
      });
      setRooms((r) => [room, ...(r ?? [])]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Phòng học cùng Byte"
        subtitle="Tạo phòng chờ, chia sẻ mã và đón học sinh vào lớp."
      />
      <GameCard>
        <form onSubmit={create} className="form-stack">
          <div className="inline-form">
            <label>
              Tên phòng
              <input
                name="name"
                placeholder="Buổi khám phá máy tính"
                required
                maxLength={80}
              />
            </label>
            <label>
              Lớp học
              <select name="classroomId">
                <option value="">Không gắn lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Bài học
            <select name="lessonId" required>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ·{' '}
                  {l.available ? 'Có thể luyện tập' : 'Đang phát triển'}
                </option>
              ))}
            </select>
          </label>
          <p className="development">
            Có thể bắt đầu 12 bài luyện chuột và tạm dừng, tiếp tục cả lớp. Các
            phân khu khác đang phát triển.
          </p>
          <GameButton disabled={busy || !lessons.length}>
            {busy ? 'Đang tạo phòng…' : 'Tạo phòng học'}
          </GameButton>
        </form>
      </GameCard>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="rooms-grid">
        {rooms?.map((room) => (
          <RoomPanel key={room.id} initial={room} teacherControl />
        ))}
      </div>
      {rooms?.length === 0 && (
        <p className="empty-state">
          Chưa có phòng học. Tạo một phòng để nhận mã tham gia.
        </p>
      )}
    </>
  );
}
export function AdminLessons() {
  const [data, setData] = useState<Lesson[]>();
  const [error, setError] = useState('');
  useEffect(() => {
    api<Lesson[]>('/lessons')
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <>
      <PageHeader
        title="Thư viện bài luyện tập"
        subtitle="Cấu trúc bài học đã sẵn sàng. Gameplay sẽ được bổ sung từng phân khu."
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="lesson-grid">
        {data?.map((l) => (
          <LessonCard key={l.id} lesson={l} />
        ))}
      </div>
    </>
  );
}
interface Report {
  id: string;
  score: number;
  accuracy: number;
  wpm: number;
  cpm: number;
  errorCount: number;
  durationMs: number;
  createdAt: string;
  attempt: { lessonId: string; student: { name: string } };
}
export function AdminReports() {
  const [data, setData] = useState<Report[]>();
  const [error, setError] = useState('');
  useEffect(() => {
    api<Report[]>('/reports')
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <>
      <PageHeader
        title="Kết quả học tập"
        subtitle="Chỉ hiển thị kết quả thực được lưu trong hệ thống."
      />
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !data ? (
        <LoadingScreen />
      ) : data.length === 0 ? (
        <GameCard>
          <h2>Chưa có kết quả học tập</h2>
          <p>
            Kết quả sẽ xuất hiện khi các bài luyện được mở và học sinh hoàn
            thành lượt chơi.
          </p>
        </GameCard>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Bài học</th>
                <th>Điểm</th>
                <th>Chính xác</th>
                <th>Luyện gõ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td>{r.attempt.student.name}</td>
                  <td>{r.attempt.lessonId}</td>
                  <td>{r.score}</td>
                  <td>{Math.round(r.accuracy * 100)}%</td>
                  <td>
                    {/^(keyboard|vietnamese)-/.test(r.attempt.lessonId)
                      ? `${r.wpm} WPM · ${r.cpm} ký tự/phút · ${r.errorCount} lỗi · ${(r.durationMs / 1000).toFixed(1)}s`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
