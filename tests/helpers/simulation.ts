import {
  simulationDefinition,
  simulationLessons,
  type SimulationCommand,
} from '@byte/shared';
export function solution(id: string): SimulationCommand[] {
  const definition = simulationDefinition(
    simulationLessons.find((l) => l.id === id)!,
  );
  if (definition.kind === 'files') {
    const commands: Record<number, SimulationCommand[]> = {
      1: [{ domain: 'files', command: { type: 'open', id: 'images' } }],
      2: [
        {
          domain: 'files',
          command: { type: 'create', parentId: 'study', name: 'Bài tập' },
        },
      ],
      3: [
        {
          domain: 'files',
          command: { type: 'rename', id: 'draft', name: 'Vở của em' },
        },
      ],
      7: [
        { domain: 'files', command: { type: 'copy', id: 'flower' } },
        { domain: 'files', command: { type: 'paste', parentId: 'images' } },
      ],
      8: [
        {
          domain: 'files',
          command: {
            type: 'move',
            id: 'homework',
            parentId: 'docs',
            via: 'drag',
          },
        },
      ],
      9: [
        { domain: 'files', command: { type: 'delete', id: 'song' } },
        { domain: 'files', command: { type: 'restore', id: 'song' } },
      ],
      10: [
        {
          domain: 'files',
          command: { type: 'create', parentId: 'study', name: 'Bài tập' },
        },
        {
          domain: 'files',
          command: { type: 'rename', id: 'new-1', name: 'Góc học tập' },
        },
        ...['homework', 'schedule'].map((id) => ({
          domain: 'files' as const,
          command: {
            type: 'move' as const,
            id,
            parentId: 'new-1',
            via: 'menu' as const,
          },
        })),
        ...['flower', 'cat'].map((id) => ({
          domain: 'files' as const,
          command: {
            type: 'move' as const,
            id,
            parentId: 'images',
            via: 'menu' as const,
          },
        })),
      ],
    };
    return (
      commands[definition.number] ??
      definition.goals.flatMap((g) =>
        g.test.kind === 'parent' && g.test.parentId
          ? [
              {
                domain: 'files' as const,
                command: {
                  type: 'move' as const,
                  id: g.test.id,
                  parentId: g.test.parentId,
                  via: 'menu' as const,
                },
              },
            ]
          : [],
      )
    );
  }
  if (definition.kind === 'quiz')
    return definition.questions!.map((q) => ({
      domain: 'quiz',
      questionId: q.id,
      choiceId: q.choices.find((c) => c.correct)!.id,
    }));
  if (definition.kind === 'dismiss') return [{ domain: 'dismiss' }];
  const actions: Record<string, SimulationCommand[]> = {
    launch: [],
    close: [{ domain: 'desktop', command: { type: 'close', id: 'notes' } }],
    minimize: [
      { domain: 'desktop', command: { type: 'minimize', id: 'notes' } },
    ],
    maximize: [
      { domain: 'desktop', command: { type: 'maximize', id: 'notes' } },
    ],
    drag: [
      {
        domain: 'desktop',
        command: { type: 'drag', id: 'notes', x: 200, y: 80 },
      },
    ],
    resize: [
      {
        domain: 'desktop',
        command: { type: 'resize', id: 'notes', width: 550, height: 350 },
      },
    ],
    switch: [
      { domain: 'desktop', command: { type: 'launch', id: 'gallery' } },
      { domain: 'desktop', command: { type: 'focus', id: 'notes' } },
    ],
    taskbar: [
      { domain: 'desktop', command: { type: 'minimize', id: 'notes' } },
      { domain: 'desktop', command: { type: 'taskbar', id: 'notes' } },
    ],
  };
  return [
    { domain: 'desktop', command: { type: 'launch', id: 'notes' } },
    ...actions[definition.desktopTask!]!,
  ];
}
