export type FileKind = 'folder' | 'file';
export interface VfsNode {
  id: string;
  parentId: string | null;
  name: string;
  type: FileKind;
  fileExtension: string | null;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    bytes?: number;
    description?: string;
    originalName?: string;
    copiedFrom?: string;
    trashed?: boolean;
    restored?: boolean;
    movedBy?: 'drag' | 'paste' | 'menu';
    previousNames?: string[];
  };
}
export interface VfsSnapshot {
  nodes: VfsNode[];
  currentId: string;
  back: string[];
  clipboard: { id: string; mode: 'copy' | 'cut' } | null;
  counter: number;
  query: string;
  sort: 'name' | 'type';
  view: 'folder' | 'trash';
}
export interface VfsState extends VfsSnapshot {
  undo: VfsSnapshot[];
}
export type VfsCommand =
  | { type: 'create'; parentId: string; name: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete' | 'restore' | 'open' | 'copy' | 'cut'; id: string }
  | { type: 'move'; id: string; parentId: string; via: 'drag' | 'menu' }
  | { type: 'paste'; parentId: string }
  | { type: 'back' | 'trash' | 'undo' }
  | { type: 'search'; query: string }
  | { type: 'sort'; sort: 'name' | 'type' };
export const ROOT_ID = 'root';
const formatTable: Record<
  string,
  { mime: string; label: string; sprite: string }
> = {
  jpg: { mime: 'image/jpeg', label: 'Ảnh JPEG', sprite: 'file_image' },
  png: { mime: 'image/png', label: 'Ảnh PNG', sprite: 'file_image' },
  mp3: { mime: 'audio/mpeg', label: 'Âm thanh MP3', sprite: 'file_audio' },
  mp4: { mime: 'video/mp4', label: 'Video MP4', sprite: 'file_video' },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Văn bản Word',
    sprite: 'file_text_document',
  },
  pdf: { mime: 'application/pdf', label: 'Tài liệu PDF', sprite: 'file_pdf' },
  pptx: {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'Bài trình chiếu',
    sprite: 'file_presentation',
  },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Bảng tính',
    sprite: 'file_spreadsheet',
  },
};
export const fileFormat = (extension: string | null) =>
  formatTable[extension ?? ''] ?? {
    mime: 'application/octet-stream',
    label: 'Tệp mô phỏng',
    sprite: 'file_text_document',
  };
const canonical = (name: string) =>
  name.normalize('NFC').toLocaleLowerCase('vi');
function cleanName(name: string) {
  const value = name.normalize('NFC').trim();
  if (!value || value === '.' || value === '..')
    throw new Error('Hãy đặt một tên có chữ hoặc số nhé.');
  if (
    value.length > 80 ||
    /[\\/:*?"<>|]/u.test(value) ||
    Array.from(value).some((c) => c.charCodeAt(0) < 32) ||
    value.endsWith('.')
  )
    throw new Error(
      'Tên quá dài hoặc có ký tự không dùng được: \\ / : * ? " < > |.',
    );
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(value))
    throw new Error('Tên này được dành riêng. Em hãy chọn tên khác.');
  return value;
}
export const getNode = (state: Pick<VfsSnapshot, 'nodes'>, id: string) => {
  const node = state.nodes.find((n) => n.id === id);
  if (!node) throw new Error('Không tìm thấy tệp hoặc thư mục.');
  return node;
};
export function isTrashed(
  state: Pick<VfsSnapshot, 'nodes'>,
  id: string,
): boolean {
  let node = getNode(state, id);
  const seen = new Set<string>();
  while (true) {
    if (seen.has(node.id)) throw new Error('Cấu trúc thư mục bị vòng lặp.');
    seen.add(node.id);
    if (node.metadata.trashed) return true;
    if (!node.parentId) return false;
    node = getNode(state, node.parentId);
  }
}
export function isDescendant(
  state: Pick<VfsSnapshot, 'nodes'>,
  id: string,
  parentId: string,
) {
  let current = getNode(state, id);
  const visited = new Set<string>();
  while (current.parentId) {
    if (current.parentId === parentId) return true;
    if (visited.has(current.id))
      throw new Error('Cấu trúc thư mục bị vòng lặp.');
    visited.add(current.id);
    current = getNode(state, current.parentId);
  }
  return false;
}
function folder(state: VfsSnapshot, id: string) {
  const node = getNode(state, id);
  if (node.type !== 'folder' || isTrashed(state, id))
    throw new Error('Hãy chọn một thư mục đang sử dụng.');
  return node;
}
function unique(
  state: VfsSnapshot,
  parentId: string,
  name: string,
  except?: string,
) {
  if (
    state.nodes.some(
      (n) =>
        n.parentId === parentId &&
        n.id !== except &&
        !n.metadata.trashed &&
        canonical(n.name) === canonical(name),
    )
  )
    throw new Error('Thư mục này đã có tên đó. Em hãy chọn tên khác.');
}
export function assertVfs(state: VfsSnapshot) {
  const ids = new Set(state.nodes.map((n) => n.id));
  if (ids.size !== state.nodes.length || state.nodes.length > 128)
    throw new Error('Cây thư mục không hợp lệ hoặc đã đầy.');
  const root = getNode(state, ROOT_ID);
  if (root.parentId !== null || root.type !== 'folder' || root.metadata.trashed)
    throw new Error('Thư mục gốc cần được giữ nguyên.');
  for (const n of state.nodes) {
    if (n.id === ROOT_ID) continue;
    if (
      !n.parentId ||
      getNode(state, n.parentId).type !== 'folder' ||
      isDescendant(state, n.parentId, n.id) ||
      n.parentId === n.id
    )
      throw new Error('Không thể tạo cấu trúc thư mục vòng lặp.');
    if (!isTrashed(state, n.id)) unique(state, n.parentId, n.name, n.id);
  }
  folder(state, state.currentId);
}
export function createFileSeed(lessonNumber: number, now: string): VfsState {
  const nodes: VfsNode[] = [];
  const add = (
    id: string,
    parentId: string | null,
    name: string,
    type: FileKind,
    description?: string,
  ) => {
    const extension =
      type === 'file' ? name.split('.').at(-1)!.toLowerCase() : null;
    nodes.push({
      id,
      parentId,
      name,
      type,
      fileExtension: extension,
      mimeType:
        type === 'folder' ? 'inode/directory' : fileFormat(extension).mime,
      createdAt: now,
      updatedAt: now,
      metadata: {
        originalName: name,
        description,
        ...(type === 'file' ? { bytes: 1024 * (nodes.length + 1) * 12 } : {}),
      },
    });
  };
  add('root', null, 'Máy tính', 'folder');
  add('study', 'root', 'Học tập', 'folder');
  add('archive', 'root', 'Lưu trữ', 'folder');
  for (const [id, name] of [
    ['images', 'Hình ảnh'],
    ['videos', 'Video'],
    ['docs', 'Tài liệu'],
    ['music', 'Âm nhạc'],
  ])
    add(id!, 'study', name!, 'folder');
  for (const [id, name, description] of [
    ['flower', 'Hoa.jpg', 'Ảnh mô phỏng: vườn hoa ở trường. 1600 × 900 px.'],
    ['cat', 'Con mèo.png', 'Ảnh mô phỏng: chú mèo nhỏ. 800 × 800 px.'],
    [
      'song',
      'Bài hát.mp3',
      'Âm thanh mô phỏng, thời lượng 2 phút. Chưa có bản thu.',
    ],
    [
      'movie',
      'Video.mp4',
      'Video mô phỏng, thời lượng 1 phút. Chưa có video thật.',
    ],
    [
      'homework',
      'Bài tập.docx',
      'Bài tập Tin học: Em hãy sắp xếp góc học tập của mình.',
    ],
    [
      'schedule',
      'Thời khóa biểu.pdf',
      'Thứ Hai: Tiếng Việt, Toán. Thứ Ba: Tin học, Mỹ thuật.',
    ],
    [
      'slides',
      'Bài trình chiếu.pptx',
      'Bài trình chiếu mô phỏng: Ngôi trường của em. Gồm 3 trang.',
    ],
    [
      'sheet',
      'Bảng điểm.xlsx',
      'Dữ liệu mẫu minh họa; không phải điểm của học sinh thật.',
    ],
  ])
    add(id!, 'study', name!, 'file', description);
  if (lessonNumber === 3) add('draft', 'study', 'Thư mục mới', 'folder');
  if (lessonNumber === 6)
    for (const [id, name] of [
      ['pdfs', 'Tệp PDF'],
      ['presentations', 'Trình chiếu'],
      ['sheets', 'Bảng tính'],
    ])
      add(id!, 'study', name!, 'folder');
  return {
    nodes,
    currentId: lessonNumber === 1 ? 'root' : 'study',
    back: [],
    clipboard: null,
    counter: 0,
    query: '',
    sort: 'name',
    view: 'folder',
    undo: [],
  };
}
const snapshot = (state: VfsState): VfsSnapshot => {
  const { undo, ...rest } = state;
  void undo;
  return structuredClone(rest);
};
/** Pure transaction. A rejected command never changes its input or clipboard. */
export function applyVfs(
  source: VfsState,
  command: VfsCommand,
  now: string,
): VfsState {
  if (command.type === 'undo') {
    const previous = source.undo.at(-1);
    if (!previous) throw new Error('Chưa có thao tác để hoàn tác.');
    return {
      ...structuredClone(previous),
      counter: source.counter,
      undo: structuredClone(source.undo.slice(0, -1)),
    };
  }
  const state = structuredClone(source);
  const mutating = [
    'create',
    'rename',
    'delete',
    'restore',
    'paste',
    'move',
  ].includes(command.type);
  if (mutating) state.undo = [...source.undo, snapshot(source)].slice(-20);
  const active = (id: string) => {
    const n = getNode(state, id);
    if (isTrashed(state, id))
      throw new Error('Tệp đang trong thùng rác. Hãy khôi phục trước.');
    return n;
  };
  const protectedNode = (id: string) => {
    const n = active(id);
    if (id === ROOT_ID)
      throw new Error('Không thể đổi, xóa hoặc di chuyển thư mục gốc.');
    return n;
  };
  const move = (
    id: string,
    parentId: string,
    via: 'drag' | 'paste' | 'menu',
  ) => {
    const n = protectedNode(id);
    folder(state, parentId);
    if (id === parentId || isDescendant(state, parentId, id))
      throw new Error(
        'Không thể đưa một thư mục vào chính nó hoặc thư mục con của nó.',
      );
    if (n.parentId === parentId)
      throw new Error('Tệp đã ở trong thư mục này rồi.');
    unique(state, parentId, n.name);
    n.parentId = parentId;
    n.updatedAt = now;
    n.metadata.movedBy = via;
  };
  switch (command.type) {
    case 'create': {
      folder(state, command.parentId);
      const name = cleanName(command.name);
      unique(state, command.parentId, name);
      state.counter++;
      state.nodes.push({
        id: `new-${state.counter}`,
        parentId: command.parentId,
        name,
        type: 'folder',
        fileExtension: null,
        mimeType: 'inode/directory',
        createdAt: now,
        updatedAt: now,
        metadata: { originalName: name },
      });
      break;
    }
    case 'rename': {
      const n = protectedNode(command.id),
        name = cleanName(command.name);
      unique(state, n.parentId!, name, n.id);
      if (n.name === name) throw new Error('Tên vẫn giống tên hiện tại.');
      n.metadata.previousNames = [
        ...(n.metadata.previousNames ?? []),
        n.name,
      ].slice(-20);
      n.name = name;
      n.updatedAt = now;
      if (n.type === 'file') {
        n.fileExtension = name.includes('.')
          ? name.split('.').at(-1)!.toLowerCase()
          : null;
        n.mimeType = fileFormat(n.fileExtension).mime;
      }
      break;
    }
    case 'delete': {
      const n = protectedNode(command.id);
      n.metadata.trashed = true;
      n.updatedAt = now;
      if (
        state.currentId === n.id ||
        isDescendant(state, state.currentId, n.id)
      ) {
        state.currentId = ROOT_ID;
        state.back = [];
      }
      if (
        state.clipboard &&
        (state.clipboard.id === n.id ||
          isDescendant(state, state.clipboard.id, n.id))
      )
        state.clipboard = null;
      break;
    }
    case 'restore': {
      const n = getNode(state, command.id);
      if (!n.metadata.trashed)
        throw new Error('Hãy khôi phục thư mục chứa tệp này trước.');
      const parent =
        n.parentId && !isTrashed(state, n.parentId) ? n.parentId : ROOT_ID;
      unique(state, parent, n.name, n.id);
      n.parentId = parent;
      n.metadata.trashed = false;
      n.metadata.restored = true;
      n.updatedAt = now;
      break;
    }
    case 'copy':
    case 'cut':
      protectedNode(command.id);
      state.clipboard = { id: command.id, mode: command.type };
      break;
    case 'paste': {
      folder(state, command.parentId);
      const clipboard = state.clipboard;
      if (!clipboard)
        throw new Error('Em hãy sao chép hoặc cắt một tệp trước.');
      const original = protectedNode(clipboard.id);
      if (clipboard.mode === 'cut') {
        move(original.id, command.parentId, 'paste');
        state.clipboard = null;
        break;
      }
      if (
        command.parentId === original.id ||
        isDescendant(state, command.parentId, original.id)
      )
        throw new Error(
          'Không thể sao chép thư mục vào chính nó hoặc thư mục con.',
        );
      const family = state.nodes.filter(
        (n) =>
          !isTrashed(state, n.id) &&
          (n.id === original.id || isDescendant(state, n.id, original.id)),
      );
      const remap = new Map(
        family.map((n) => {
          state.counter++;
          return [n.id, `new-${state.counter}`];
        }),
      );
      let copiedName = original.name;
      let suffix = 1;
      while (
        state.nodes.some(
          (n) =>
            n.parentId === command.parentId &&
            !n.metadata.trashed &&
            canonical(n.name) === canonical(copiedName),
        )
      ) {
        const dot =
          original.type === 'file' ? original.name.lastIndexOf('.') : -1;
        const base = dot > 0 ? original.name.slice(0, dot) : original.name,
          ext = dot > 0 ? original.name.slice(dot) : '';
        copiedName = `${base} - Bản sao${suffix === 1 ? '' : ` ${suffix}`}${ext}`;
        suffix++;
      }
      state.nodes.push(
        ...family.map((n) => ({
          ...structuredClone(n),
          id: remap.get(n.id)!,
          parentId:
            n.id === original.id ? command.parentId : remap.get(n.parentId!)!,
          name: n.id === original.id ? copiedName : n.name,
          createdAt: now,
          updatedAt: now,
          metadata: {
            ...n.metadata,
            copiedFrom: n.id,
            trashed: false,
            restored: false,
          },
        })),
      );
      break;
    }
    case 'move':
      move(command.id, command.parentId, command.via);
      break;
    case 'open': {
      folder(state, command.id);
      if (state.currentId !== command.id || state.view === 'trash')
        state.back = [...state.back, state.currentId].slice(-40);
      state.currentId = command.id;
      state.view = 'folder';
      state.query = '';
      break;
    }
    case 'back': {
      const back = state.back.filter((id) =>
        state.nodes.some((n) => n.id === id && !isTrashed(state, id)),
      );
      const previous = back.pop();
      if (!previous) throw new Error('Em đang ở đầu hành trình.');
      state.currentId = previous;
      state.back = back;
      state.query = '';
      state.view = 'folder';
      break;
    }
    case 'trash':
      state.view = 'trash';
      state.query = '';
      break;
    case 'search':
      state.query = command.query.normalize('NFC').slice(0, 80);
      break;
    case 'sort':
      state.sort = command.sort;
      break;
  }
  assertVfs(state);
  return state;
}
export function visibleFiles(state: VfsState) {
  let nodes =
    state.view === 'trash'
      ? state.nodes.filter((n) => n.metadata.trashed)
      : state.nodes.filter(
          (n) =>
            n.id !== ROOT_ID &&
            !isTrashed(state, n.id) &&
            (state.query
              ? isDescendant(state, n.id, state.currentId)
              : n.parentId === state.currentId),
        );
  if (state.query)
    nodes = nodes.filter((n) =>
      canonical(n.name).includes(canonical(state.query)),
    );
  return nodes.sort((a, b) =>
    a.type !== b.type
      ? a.type === 'folder'
        ? -1
        : 1
      : (state.sort === 'type'
          ? (a.fileExtension ?? '').localeCompare(b.fileExtension ?? '')
          : 0) || a.name.localeCompare(b.name, 'vi', { numeric: true }),
  );
}
export function breadcrumb(state: VfsState) {
  const path: VfsNode[] = [];
  let n = getNode(state, state.currentId);
  while (true) {
    path.unshift(n);
    if (!n.parentId) break;
    n = getNode(state, n.parentId);
  }
  return path;
}
export function folderSprite(node: VfsNode) {
  return (
    (
      {
        images: 'folder_pictures_cyan',
        videos: 'folder_videos_peach',
        docs: 'folder_documents_lavender',
        music: 'folder_music_mint',
        study: 'folder_assignments_yellow',
      } as Record<string, string>
    )[node.id] ?? 'folder_closed_gold'
  );
}
