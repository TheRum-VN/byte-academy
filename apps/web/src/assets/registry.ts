export interface Sprite {
  index: number;
  row: number;
  col: number;
  name: string;
  filename: string;
  path: string;
}
export interface Atlas {
  id: string;
  name: string;
  grid: { rows: number; cols: number };
  source_image: string;
  output_dir: string;
  sprites: Sprite[];
}
export interface AssetManifest {
  atlases: Atlas[];
  total_atlases: number;
  total_sprites: number;
}
export class AssetRegistry {
  private manifestPromise?: Promise<AssetManifest>;
  private images = new Map<string, Promise<void>>();
  readonly failures = new Set<string>();
  manifest(): Promise<AssetManifest> {
    if (!this.manifestPromise)
      this.manifestPromise = fetch('/assets/manifests/asset_manifest.json')
        .then(async (response) => {
          if (!response.ok)
            throw new Error('Không tải được danh mục hình ảnh.');
          const manifest = (await response.json()) as AssetManifest;
          if (!Array.isArray(manifest.atlases))
            throw new Error('Manifest không hợp lệ.');
          return manifest;
        })
        .catch((error) => {
          this.manifestPromise = undefined;
          throw error;
        });
    return this.manifestPromise;
  }
  async get(atlasId: string, name: string): Promise<Sprite> {
    const sprite = (await this.manifest()).atlases
      .find((a) => a.id === atlasId)
      ?.sprites.find((s) => s.name === name);
    if (!sprite) throw new Error(`Không tìm thấy sprite: ${atlasId}/${name}`);
    return sprite;
  }
  load(path: string): Promise<void> {
    let promise = this.images.get(path);
    if (!promise) {
      promise = new Promise<void>((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.src = '';
          reject(new Error(`Quá thời gian tải: ${path}`));
        }, 20000);
        img.onload = () => {
          clearTimeout(timer);
          this.failures.delete(path);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error(`Thiếu hoặc lỗi ảnh: ${path}`));
        };
        img.src = path;
      }).catch((error) => {
        this.failures.add(path);
        this.images.delete(path);
        throw error;
      });
      this.images.set(path, promise);
    }
    return promise;
  }
  async preload(
    atlasIds: readonly string[],
    onProgress?: (loaded: number, total: number) => void,
  ) {
    const sprites = (await this.manifest()).atlases
      .filter((a) => atlasIds.includes(a.id))
      .flatMap((a) => a.sprites);
    let done = 0;
    return Promise.allSettled(
      sprites.map(async (s) => {
        try {
          await this.load(s.path);
        } finally {
          onProgress?.(++done, sprites.length);
        }
      }),
    );
  }
}
export const assets = new AssetRegistry();
export const moduleAtlases: Record<string, readonly string[]> = {
  mouse: ['04', '05', '06'],
  keyboard: ['07', '08'],
  files: ['09', '10'],
  vietnamese: ['08', '11'],
  computer: ['03', '15'],
  safety: ['15'],
};
