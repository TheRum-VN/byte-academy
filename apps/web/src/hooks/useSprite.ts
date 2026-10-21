import { useEffect, useState } from 'react';
import { assets } from '../assets/registry';
export function useSprite(atlas: string, name: string) {
  const [state, setState] = useState<{ path?: string; error?: string }>({});
  useEffect(() => {
    let active = true;
    setState({});
    assets
      .get(atlas, name)
      .then(async (sprite) => {
        await assets.load(sprite.path);
        if (active) setState({ path: sprite.path });
      })
      .catch((error) => {
        if (active) setState({ error: String(error) });
      });
    return () => {
      active = false;
    };
  }, [atlas, name]);
  return state;
}
