import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Lesson, StudentOverview } from '@byte/shared';
import { api } from '../../services/api';

interface StudentData {
  lessons: Lesson[];
  overview: StudentOverview | null;
  loading: boolean;
  error: string;
  refresh: () => void;
}
const Context = createContext<StudentData | null>(null);
export function StudentDataProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<Omit<StudentData, 'refresh'>>({
    lessons: [],
    overview: null,
    loading: true,
    error: '',
  });
  const refresh = useCallback(() => {
    window.dispatchEvent(new Event('byte:refresh'));
  }, []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const load = () => {
      const current = ++revision;
      setState((s) => ({ ...s, loading: true, error: '' }));
      Promise.all([
        api<Lesson[]>('/lessons'),
        api<StudentOverview>('/student/overview'),
      ])
        .then(([lessons, overview]) => {
          if (active && current === revision)
            setState({ lessons, overview, loading: false, error: '' });
        })
        .catch(() => {
          if (active && current === revision)
            setState({
              lessons: [],
              overview: null,
              loading: false,
              error: 'Chưa kết nối được dữ liệu học tập. Em hãy thử lại nhé.',
            });
        });
    };
    load();
    window.addEventListener('byte:refresh', load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.removeEventListener('byte:refresh', load);
      window.removeEventListener('focus', load);
    };
  }, []);
  return (
    <Context.Provider value={{ ...state, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useStudentData() {
  const data = useContext(Context);
  if (!data) throw new Error('StudentDataProvider is required');
  return data;
}
