import { useEffect, useState } from 'react';
import { assets, type AssetManifest } from '../assets/registry';
import { Sprite, PageHeader, GameBadge, LoadingScreen } from '../components/ui';
export function AssetGallery() {
  const [manifest, setManifest] = useState<AssetManifest>();
  const [error, setError] = useState('');
  useEffect(() => {
    assets
      .manifest()
      .then(setManifest)
      .catch((e) => setError(String(e)));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!manifest) return <LoadingScreen />;
  return (
    <main className="gallery">
      <PageHeader
        title="Asset explorer"
        subtitle="Chỉ có trong development. 18 atlas · 264 sprite · trạng thái tải thực tế."
      />
      {manifest.atlases.map((a) => (
        <section key={a.id}>
          <h2>
            {a.id} · {a.name} <GameBadge>{a.sprites.length} sprites</GameBadge>
          </h2>
          <div className="asset-grid">
            {a.sprites.map((s) => (
              <figure key={s.path}>
                <Sprite atlas={a.id} name={s.name} alt={s.name} />
                <figcaption>
                  <strong>{s.name}</strong>
                  <small>{s.filename}</small>
                  <AssetStatus path={s.path} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
function AssetStatus({ path }: { path: string }) {
  const [state, setState] = useState('Đang tải');
  useEffect(() => {
    assets
      .load(path)
      .then(() => setState('Đã tải'))
      .catch(() => setState('Lỗi tải ảnh'));
  }, [path]);
  return <small role="status">{state}</small>;
}
