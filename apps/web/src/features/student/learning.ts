import type { Lesson, StudentOverview } from '@byte/shared';

export function learningProgress(
  lessons: Lesson[],
  overview: StudentOverview | null,
) {
  const completed = lessons.filter((lesson) =>
    overview?.progress.some(
      (p) => p.lessonId === lesson.id && p.completedCount > 0,
    ),
  ).length;
  const started = lessons.some((lesson) =>
    overview?.activeLessonIds.includes(lesson.id),
  );
  return {
    completed,
    total: lessons.length,
    percent: lessons.length ? (completed / lessons.length) * 100 : 0,
    status:
      completed && completed === lessons.length
        ? 'Đã hoàn thành'
        : started || completed
          ? 'Đang học'
          : 'Chưa bắt đầu',
  };
}
export function lessonStars(lesson: Lesson, overview: StudentOverview | null) {
  return lesson.rewards.reduce(
    (total, reward) =>
      total +
      (overview?.achievements.find((a) => a.rewardId === reward.id)?.stars ??
        0),
    0,
  );
}
export function todayMissions(
  lessons: Lesson[],
  overview: StudentOverview | null,
) {
  // Assigned lesson first; otherwise use the curriculum order. No invented mission records.
  return [...lessons]
    .sort(
      (a, b) =>
        Number(b.id === overview?.room?.lessonId) -
        Number(a.id === overview?.room?.lessonId),
    )
    .slice(0, 3);
}
