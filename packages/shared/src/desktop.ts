export type AppId = 'notes' | 'gallery';
export interface SimWindow {
  id: AppId;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}
export interface DesktopState {
  windows: SimWindow[];
  focused: AppId | null;
  sequence: number;
  actions: { type: string; id: AppId }[];
}
export type DesktopCommand =
  | {
      type: 'launch' | 'close' | 'minimize' | 'maximize' | 'focus' | 'taskbar';
      id: AppId;
    }
  | { type: 'drag'; id: AppId; x: number; y: number }
  | { type: 'resize'; id: AppId; width: number; height: number };
export const appDefinitions = [
  {
    id: 'notes' as const,
    title: 'Ghi chú của em',
    atlas: '09',
    sprite: 'file_text_document',
  },
  {
    id: 'gallery' as const,
    title: 'Album khám phá',
    atlas: '09',
    sprite: 'folder_pictures_cyan',
  },
];
export function createDesktop(): DesktopState {
  return {
    windows: appDefinitions.map((a, i) => ({
      id: a.id,
      open: false,
      minimized: false,
      maximized: false,
      x: 70 + i * 190,
      y: 50 + i * 80,
      width: 420,
      height: 260,
      z: 0,
    })),
    focused: null,
    sequence: 0,
    actions: [],
  };
}
export function windowStatus(state: DesktopState, id: AppId) {
  const w = state.windows.find((w) => w.id === id)!;
  return !w.open
    ? 'Closed'
    : w.minimized
      ? 'Minimized'
      : w.maximized
        ? 'Maximized'
        : state.focused === id
          ? 'Focused'
          : 'Background';
}
export function applyDesktop(
  source: DesktopState,
  command: DesktopCommand,
): DesktopState {
  const state = structuredClone(source),
    w = state.windows.find((w) => w.id === command.id);
  if (!w) throw new Error('Ứng dụng này chưa có trong máy tính mô phỏng.');
  const focus = () => {
    state.sequence++;
    w.z = state.sequence;
    state.focused = w.id;
  };
  const nextFocus = () => {
    state.focused =
      state.windows
        .filter((n) => n.open && !n.minimized)
        .sort((a, b) => b.z - a.z)[0]?.id ?? null;
  };
  if (command.type === 'launch') {
    w.open = true;
    w.minimized = false;
    focus();
  } else {
    if (!w.open) throw new Error('Em hãy mở ứng dụng trước.');
    switch (command.type) {
      case 'close':
        w.open = false;
        w.minimized = false;
        w.maximized = false;
        nextFocus();
        break;
      case 'taskbar':
        if (w.minimized) {
          w.minimized = false;
          focus();
        } else if (state.focused === w.id) {
          w.minimized = true;
          nextFocus();
        } else focus();
        break;
      case 'minimize':
        if (w.minimized) throw new Error('Cửa sổ đã được thu nhỏ.');
        w.minimized = true;
        nextFocus();
        break;
      case 'focus':
        if (w.minimized)
          throw new Error('Bấm biểu tượng trên thanh tác vụ để mở lại.');
        focus();
        break;
      case 'maximize':
        if (w.minimized) throw new Error('Em hãy mở lại cửa sổ trước.');
        w.maximized = !w.maximized;
        focus();
        break;
      case 'drag':
        if (w.minimized || w.maximized)
          throw new Error('Khôi phục kích thước cửa sổ trước khi kéo.');
        if (!Number.isFinite(command.x) || !Number.isFinite(command.y))
          throw new Error('Vị trí cửa sổ không hợp lệ.');
        w.x = Math.round(Math.max(0, Math.min(1000 - w.width, command.x)));
        w.y = Math.round(Math.max(0, Math.min(550 - w.height, command.y)));
        focus();
        break;
      case 'resize':
        if (w.minimized || w.maximized)
          throw new Error('Khôi phục cửa sổ trước khi đổi kích thước.');
        if (!Number.isFinite(command.width) || !Number.isFinite(command.height))
          throw new Error('Kích thước không hợp lệ.');
        w.width = Math.round(
          Math.max(280, Math.min(1000 - w.x, command.width)),
        );
        w.height = Math.round(
          Math.max(190, Math.min(550 - w.y, command.height)),
        );
        focus();
        break;
    }
  }
  state.actions = [...state.actions, { type: command.type, id: w.id }].slice(
    -200,
  );
  return state;
}
