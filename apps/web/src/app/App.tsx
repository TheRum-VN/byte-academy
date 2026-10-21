import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router';
import { MotionConfig } from 'motion/react';
import {
  StudentLayout,
  StudentHome,
  ModulePage,
  ExplorePage,
  Missions,
  AchievementsPage,
} from '../pages/Student';
import { Landing } from '../pages/Landing';
import { LoadingScreen } from '../components/ui';
import { modules } from '@byte/shared';
import '../styles/practice.css';
const MouseGamePage = lazy(() =>
  import('../games/mouse/MouseGamePage').then((m) => ({
    default: m.MouseGamePage,
  })),
);
const TypingGamePage = lazy(() =>
  import('../games/typing/TypingGamePage').then((m) => ({
    default: m.TypingGamePage,
  })),
);
const SimulationGamePage = lazy(() =>
  import('../games/simulation/SimulationGamePage').then((m) => ({
    default: m.SimulationGamePage,
  })),
);
const AdminLogin = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminLogin })),
);
const AdminLayout = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminLayout })),
);
const AdminOverview = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminOverview })),
);
const AdminClasses = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminClasses })),
);
const AdminRooms = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminRooms })),
);
const AdminLessons = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminLessons })),
);
const AdminReports = lazy(() =>
  import('../pages/Admin').then((m) => ({ default: m.AdminReports })),
);
const AssetGallery = import.meta.env.DEV
  ? lazy(() =>
      import('../pages/AssetGallery').then((m) => ({
        default: m.AssetGallery,
      })),
    )
  : null;
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/play" element={<StudentLayout />}>
              <Route index element={<StudentHome />} />
              <Route
                path="mouse/practice/:lessonId"
                element={<MouseGamePage />}
              />
              <Route path="explore" element={<ExplorePage />} />
              <Route
                path="keyboard/practice/:lessonId"
                element={<TypingGamePage />}
              />
              <Route
                path="vietnamese/practice/:lessonId"
                element={<TypingGamePage />}
              />
              <Route path="missions" element={<Missions />} />
              {['files', 'computer', 'safety'].map((id) => (
                <Route
                  key={id}
                  path={`${id}/practice/:lessonId`}
                  element={<SimulationGamePage />}
                />
              ))}
              <Route path="achievements" element={<AchievementsPage />} />
              {modules.map((m) => (
                <Route
                  key={m.id}
                  path={m.id}
                  element={<ModulePage id={m.id} />}
                />
              ))}
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="lessons" element={<AdminLessons />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
            {AssetGallery && (
              <Route path="/dev/assets" element={<AssetGallery />} />
            )}
            <Route
              path="*"
              element={
                <main className="empty-state">
                  <h1>Không tìm thấy trang</h1>
                  <Link to="/play">Về không gian học sinh</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
