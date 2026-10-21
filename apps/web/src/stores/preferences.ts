import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const usePreferences = create(
  persist<{
    muted: boolean;
    volume: number;
    toggleAudio: () => void;
    setVolume: (volume: number) => void;
  }>(
    (set) => ({
      muted: true,
      volume: 0.8,
      toggleAudio: () => set((s) => ({ muted: !s.muted })),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
    }),
    { name: 'byte-preferences' },
  ),
);
