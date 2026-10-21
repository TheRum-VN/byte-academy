import { describe, it, expect } from 'vitest';
import { transitionGame, transitionRoom, lessons } from '@byte/shared';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  AssetRegistry,
  type AssetManifest,
} from '../../apps/web/src/assets/registry';
import { vi } from 'vitest';
describe('state contracts', () => {
  it('keeps game lifecycle distinct from room lifecycle', () => {
    expect(transitionGame('PLAYING', 'COMPLETED')).toBe('COMPLETED');
    expect(() => transitionRoom('PLAYING', 'LEADERBOARD')).toThrow();
    expect(() => transitionGame('IDLE', 'PLAYING')).toThrow();
    expect(transitionRoom('PAUSED', 'PLAYING')).toBe('PLAYING');
  });
  it('keeps legacy intros unavailable and opens mouse and typing curricula', () => {
    expect(lessons).toHaveLength(70);
    for (const lesson of lessons) {
      expect(lesson.available).toBe(!lesson.id.endsWith('-intro'));
      expect(lesson.scoringRules.maxScore).toBeCloseTo(
        lesson.targetCount * lesson.scoringRules.pointsPerTarget,
      );
    }
  });
  it('resolves every sprite through its exact manifest path', async () => {
    const manifest = JSON.parse(
      readFileSync('public/assets/manifests/asset_manifest.json', 'utf8'),
    ) as AssetManifest;
    expect(manifest.atlases).toHaveLength(18);
    expect(manifest.atlases.flatMap((a) => a.sprites)).toHaveLength(264);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => manifest }),
    );
    const registry = new AssetRegistry();
    for (const atlas of manifest.atlases) {
      for (const sprite of atlas.sprites) {
        expect((await registry.get(atlas.id, sprite.name)).path).toBe(
          sprite.path,
        );
        expect(existsSync(join('public', sprite.path))).toBe(true);
      }
    }
    await expect(registry.get('00', 'missing')).rejects.toThrow();
    vi.unstubAllGlobals();
  });
  it('retries a failed manifest fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ atlases: [] }),
        }),
    );
    const registry = new AssetRegistry();
    await expect(registry.manifest()).rejects.toThrow();
    await expect(registry.manifest()).resolves.toEqual({ atlases: [] });
    vi.unstubAllGlobals();
  });
});
