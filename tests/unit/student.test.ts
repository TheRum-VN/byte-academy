import { afterEach, describe, expect, it, vi } from 'vitest';
import { lessons, type StudentOverview } from '@byte/shared';
import {
  learningProgress,
  lessonStars,
  todayMissions,
} from '../../apps/web/src/features/student/learning';
import { AudioManager } from '../../apps/web/src/services/audio';

const overview: StudentOverview = {
  student: null,
  classroom: null,
  room: null,
  progress: [],
  achievements: [],
  activeLessonIds: [],
  todayCompletedLessonIds: [],
};
afterEach(() => vi.unstubAllGlobals());
describe('student learning summaries', () => {
  it('counts only completed curriculum lessons and separates earned rewards', () => {
    const data = {
      ...overview,
      progress: [
        { lessonId: 'mouse-intro', completedCount: 2, bestScore: 100 },
        { lessonId: 'unknown', completedCount: 1, bestScore: 100 },
      ],
      achievements: [{ rewardId: 'mouse-first', stars: 1 }],
    };
    expect(learningProgress(lessons, data)).toMatchObject({
      completed: 1,
      total: lessons.length,
      status: 'Đang học',
    });
    expect(lessonStars(lessons[0]!, data)).toBe(1);
    expect(lessonStars(lessons[1]!, data)).toBe(0);
    expect(learningProgress([lessons[0]!], data).status).toBe('Đã hoàn thành');
    expect(learningProgress([], data).percent).toBe(0);
  });
  it('does not turn an active attempt into completion or invent guest progress', () => {
    expect(learningProgress(lessons, null)).toMatchObject({
      completed: 0,
      percent: 0,
      status: 'Chưa bắt đầu',
    });
    expect(
      learningProgress(lessons, {
        ...overview,
        activeLessonIds: ['mouse-intro'],
      }),
    ).toMatchObject({ completed: 0, status: 'Đang học' });
  });
  it('prioritizes the assigned lesson without mutating the curriculum', () => {
    const data = {
      ...overview,
      room: {
        id: 'room',
        code: 'ABC234',
        name: 'Room',
        lessonId: 'safety-intro',
        state: 'LOBBY' as const,
        revision: 0,
        memberCount: 1,
      },
    };
    expect(todayMissions(lessons, data)[0]?.id).toBe('safety-intro');
    expect(lessons[0]?.id).toBe('mouse-intro');
  });
});
describe('AudioManager', () => {
  it('does not stop a newer recording when an earlier play promise fails late', async () => {
    let rejectFirst: (error: Error) => void = () => {};
    const firstPause = vi.fn();
    const secondPause = vi.fn();
    let count = 0;
    vi.stubGlobal(
      'Audio',
      class {
        pause = count++ === 0 ? firstPause : secondPause;
        play =
          this.pause === firstPause
            ? () =>
                new Promise<void>((_resolve, reject) => {
                  rejectFirst = reject;
                })
            : () => Promise.resolve();
      },
    );
    const manager = new AudioManager({
      a: { text: 'Một', mp3: '/a.mp3' },
      b: { text: 'Hai', mp3: '/b.mp3' },
    });
    manager.configure(false, 1);
    const first = manager.play('a');
    expect(await manager.play('b')).toBe('played');
    rejectFirst(new Error('Aborted'));
    expect(await first).toBe('muted');
    expect(firstPause).toHaveBeenCalled();
    expect(secondPause).not.toHaveBeenCalled();
  });
  it('never plays without sound enabled and safely handles absent Vietnamese voices', async () => {
    const play = vi.fn();
    vi.stubGlobal(
      'Audio',
      class {
        play = play;
        pause = vi.fn();
      },
    );
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel: vi.fn(),
        getVoices: () => [{ lang: 'en-US' }],
        speak: vi.fn(),
      },
    });
    const manager = new AudioManager({
      intro: { text: 'Xin chào', mp3: '/missing.mp3' },
    });
    expect(await manager.play('intro')).toBe('muted');
    expect(play).not.toHaveBeenCalled();
    manager.configure(false, 0.5);
    expect(await manager.play('no-recording', 'Hướng dẫn')).toBe('unavailable');
  });
  it('uses an actual vi-VN voice after an MP3 failure and stops on mute', async () => {
    const pause = vi.fn();
    vi.stubGlobal(
      'Audio',
      class {
        volume = 1;
        play = vi.fn().mockRejectedValue(new Error('Missing file'));
        pause = pause;
      },
    );
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel,
        getVoices: () => [{ lang: 'vi-VN', name: 'Vietnamese' }],
        speak,
      },
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(public text: string) {}
      },
    );
    const manager = new AudioManager({
      intro: { text: 'Xin chào', mp3: '/missing.mp3' },
    });
    manager.configure(false, 0.4);
    expect(await manager.play('intro')).toBe('played');
    expect(speak.mock.calls[0]?.[0]).toMatchObject({
      text: 'Xin chào',
      lang: 'vi-VN',
      volume: 0.4,
    });
    manager.configure(true, 0.4);
    expect(cancel).toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
  });
  it('handles autoplay denial without an unhandled rejection', async () => {
    vi.stubGlobal(
      'Audio',
      class {
        play = vi.fn().mockRejectedValue(
          Object.assign(new Error('Gesture required'), {
            name: 'NotAllowedError',
          }),
        );
        pause = vi.fn();
      },
    );
    const manager = new AudioManager({
      intro: { text: 'Xin chào', mp3: '/voice.mp3' },
    });
    manager.configure(false, 1);
    expect(await manager.play('intro')).toBe('blocked');
  });
});
