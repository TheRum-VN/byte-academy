import { useEffect, useState } from 'react';
import { assets, moduleAtlases } from '../assets/registry';
export function useModuleAssets(id: string) {
  const [state, setState] = useState({
    loaded: 0,
    total: 0,
    error: '',
    done: false,
  });
  useEffect(() => {
    let active = true;
    setState({ loaded: 0, total: 0, error: '', done: false });
    assets
      .preload(moduleAtlases[id] ?? [], (loaded, total) => {
        if (active) setState((s) => ({ ...s, loaded, total }));
      })
      .then((results) => {
        if (active)
          setState((s) => ({
            ...s,
            done: true,
            error: results.some((r) => r.status === 'rejected')
              ? 'Một số hình chưa tải được. Hãy kiểm tra mạng và tải lại trang.'
              : '',
          }));
      })
      .catch((error) => {
        if (active)
          setState((s) => ({ ...s, error: String(error), done: true }));
      });
    return () => {
      active = false;
    };
  }, [id]);
  return state;
}
