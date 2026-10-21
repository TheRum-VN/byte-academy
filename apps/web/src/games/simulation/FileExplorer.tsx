import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  CaretRight,
  DotsThree,
  FolderPlus,
  Info,
  Trash,
  X,
} from '@phosphor-icons/react';
import {
  ROOT_ID,
  breadcrumb,
  fileFormat,
  folderSprite,
  getNode,
  isTrashed,
  visibleFiles,
  type VfsCommand,
  type VfsNode,
  type VfsState,
} from '@byte/shared';
import { GameButton, GameModal, Sprite } from '../../components/ui';
type Dialog = {
  type: 'create' | 'rename' | 'delete' | 'info' | 'preview' | 'move';
  id?: string;
};
export function FileExplorer({
  state,
  disabled,
  onCommand,
  error,
}: {
  state: VfsState;
  disabled: boolean;
  onCommand: (command: VfsCommand) => Promise<boolean>;
  error: string;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [name, setName] = useState(''),
    [destination, setDestination] = useState('study');
  const [menu, setMenu] = useState<{
      id: string | null;
      x: number;
      y: number;
    } | null>(null),
    [search, setSearch] = useState(state.query),
    [drop, setDrop] = useState<string | null>(null);
  const drag = useRef<string | null>(null),
    container = useRef<HTMLDivElement>(null),
    menuRef = useRef<HTMLDivElement>(null),
    selectedRef = useRef(selected);
  selectedRef.current = selected;
  const node = selected
    ? state.nodes.find((n) => n.id === selected)
    : undefined;
  const dialogNode = dialog?.id
    ? state.nodes.find((n) => n.id === dialog.id)
    : undefined;
  const items = visibleFiles(state),
    trash = state.view === 'trash',
    current = getNode(state, state.currentId);
  useEffect(() => {
    setSearch(state.query);
  }, [state.query]);
  useEffect(() => {
    if (disabled) {
      drag.current = null;
      setDrop(null);
      setMenu(null);
    } else if (document.activeElement === document.body)
      container.current?.focus({ preventScroll: true });
  }, [disabled]);
  useEffect(() => {
    setMenu(null);
    drag.current = null;
    setDrop(null);
    if (
      selectedRef.current &&
      !visibleFiles(state).some((n) => n.id === selectedRef.current)
    )
      setSelected(null);
  }, [state]);
  useEffect(
    () => setSelected(null),
    [state.currentId, state.view, state.query],
  );
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);
  const run = async (command: VfsCommand) => {
    if (disabled) return false;
    setMenu(null);
    return onCommand(command);
  };
  const openDialog = (type: Dialog['type'], id?: string) => {
    setMenu(null);
    setDialog({ type, id });
    setName(type === 'rename' && id ? getNode(state, id).name : '');
    setDestination(state.currentId);
  };
  const restoreFocus = () => {
    setMenu(null);
    container.current
      ?.querySelector<HTMLButtonElement>(
        `[data-nodeid="${selectedRef.current ?? ''}"]`,
      )
      ?.focus();
  };
  function context(e: React.MouseEvent, id: string | null) {
    e.preventDefault();
    if (disabled) return;
    setSelected(id);
    setMenu({
      id,
      x: Math.min(e.clientX, innerWidth - 225),
      y: Math.max(8, Math.min(e.clientY, innerHeight - 430)),
    });
  }
  const icon = (n: VfsNode) =>
    n.type === 'folder' ? folderSprite(n) : fileFormat(n.fileExtension).sprite;
  const transfer = (e: React.DragEvent, parentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDrop(null);
    const id = drag.current;
    drag.current = null;
    if (
      disabled ||
      !id ||
      e.dataTransfer.getData('application/x-byte-node') !== id
    )
      return;
    void run({ type: 'move', id, parentId, via: 'drag' });
  };
  function tree(parentId: string, depth = 0): React.ReactNode {
    return state.nodes
      .filter(
        (n) =>
          n.parentId === parentId &&
          n.type === 'folder' &&
          !isTrashed(state, n.id),
      )
      .map((n) => (
        <div key={n.id}>
          <button
            className={`tree-folder ${!trash && state.currentId === n.id ? 'active' : ''} ${drop === n.id ? 'drop-target' : ''}`}
            style={{ paddingLeft: 12 + depth * 14 }}
            disabled={disabled}
            onClick={() => void run({ type: 'open', id: n.id })}
            onContextMenu={(e) => context(e, n.id)}
            onDragOver={(e) => {
              if (drag.current && !disabled) {
                e.preventDefault();
                e.stopPropagation();
                setDrop(n.id);
              }
            }}
            onDrop={(e) => transfer(e, n.id)}
          >
            <Sprite atlas="09" name={icon(n)} />
            <span>{n.name}</span>
          </button>
          {tree(n.id, depth + 1)}
        </div>
      ));
  }
  const actions: {
    label: string;
    sprite: string;
    disabled?: boolean;
    action: () => void;
  }[] = [
    {
      label: 'Thư mục mới',
      sprite: 'action_new_folder',
      disabled: trash,
      action: () => openDialog('create'),
    },
    {
      label: 'Đổi tên',
      sprite: 'action_rename',
      disabled: !node || trash || node.id === ROOT_ID,
      action: () => openDialog('rename', selected!),
    },
    {
      label: 'Sao chép',
      sprite: 'action_copy',
      disabled: !node || trash || node.id === ROOT_ID,
      action: () => void run({ type: 'copy', id: selected! }),
    },
    {
      label: 'Cắt',
      sprite: 'action_cut',
      disabled: !node || trash || node.id === ROOT_ID,
      action: () => void run({ type: 'cut', id: selected! }),
    },
    {
      label: 'Dán',
      sprite: 'action_paste',
      disabled: !state.clipboard || trash,
      action: () => void run({ type: 'paste', parentId: state.currentId }),
    },
    {
      label: 'Di chuyển',
      sprite: 'action_move',
      disabled: !node || trash || node.id === ROOT_ID,
      action: () => openDialog('move', selected!),
    },
    {
      label: trash ? 'Khôi phục' : 'Xóa',
      sprite: trash ? 'action_restore' : 'action_delete',
      disabled: !node || node.id === ROOT_ID,
      action: () =>
        trash
          ? void run({ type: 'restore', id: selected! })
          : openDialog('delete', selected!),
    },
    {
      label: 'Hoàn tác',
      sprite: 'action_undo',
      disabled: !state.undo.length,
      action: () => void run({ type: 'undo' }),
    },
  ];
  return (
    <div
      className="file-explorer"
      tabIndex={0}
      role="region"
      aria-label="Cửa sổ quản lý tệp mô phỏng"
      ref={container}
      onKeyDown={(e) => {
        if (
          disabled ||
          dialog ||
          menu ||
          (e.target instanceof HTMLElement &&
            e.target.matches('input,textarea,select'))
        )
          return;
        const id = selected;
        if (
          (e.ctrlKey || e.metaKey) &&
          ['c', 'x', 'v', 'z'].includes(e.key.toLowerCase())
        ) {
          e.preventDefault();
          const key = e.key.toLowerCase();
          if (key === 'z') void run({ type: 'undo' });
          else if (!trash) {
            if (key === 'v')
              void run({ type: 'paste', parentId: state.currentId });
            else if (id && id !== ROOT_ID)
              void run({ type: key === 'c' ? 'copy' : 'cut', id });
          }
        } else if (e.key === 'F2' && id && !trash && id !== ROOT_ID) {
          e.preventDefault();
          openDialog('rename', id);
        } else if (e.key === 'Delete' && id && !trash && id !== ROOT_ID) {
          e.preventDefault();
          openDialog('delete', id);
        } else if (e.key === 'Enter' && node && !trash) {
          e.preventDefault();
          if (node.type === 'folder') void run({ type: 'open', id: node.id });
          else openDialog('preview', node.id);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          void run({ type: 'back' });
        }
      }}
    >
      <div className="explorer-title">
        <Sprite atlas="09" name="folder_open_gold" />
        <div>
          <strong>Thành phố Tệp tin</strong>
          <small>Máy tính mô phỏng của em</small>
        </div>
        <span>Tệp thật trên máy luôn được giữ nguyên</span>
      </div>
      <div className="explorer-toolbar" aria-label="Thanh công cụ tệp">
        {actions.map((a) => (
          <button
            key={a.label}
            disabled={disabled || a.disabled}
            onClick={a.action}
            title={a.label}
          >
            <Sprite atlas="10" name={a.sprite} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div className="explorer-address">
        <button
          className="icon-button"
          disabled={disabled || !state.back.length}
          onClick={() => void run({ type: 'back' })}
          aria-label="Quay lại thư mục trước"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          className="icon-button"
          disabled={disabled || trash || !current.parentId}
          onClick={() =>
            current.parentId && void run({ type: 'open', id: current.parentId })
          }
          aria-label="Lên thư mục cha"
        >
          <ArrowUp size={22} />
        </button>
        <nav aria-label="Đường dẫn thư mục">
          {trash ? (
            <strong>Thùng rác mô phỏng</strong>
          ) : (
            breadcrumb(state).map((n) => (
              <span key={n.id}>
                <button
                  disabled={disabled}
                  onClick={() => void run({ type: 'open', id: n.id })}
                >
                  {n.name}
                </button>
                <CaretRight size={14} />
              </span>
            ))
          )}
        </nav>
        <button
          className="icon-button"
          aria-label="Menu thư mục hiện tại"
          disabled={disabled}
          onClick={(e) => context(e, null)}
        >
          <DotsThree size={24} />
        </button>
      </div>
      <form
        className="explorer-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ type: 'search', query: search });
        }}
      >
        <label>
          Tìm trong {trash ? 'thùng rác' : current.name}
          <span>
            <input
              aria-label="Tìm tệp và thư mục"
              value={search}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên tệp hoặc thư mục…"
            />
            <button disabled={disabled} aria-label="Tìm kiếm">
              <Sprite atlas="10" name="action_search" />
            </button>
          </span>
        </label>
        <label>
          Sắp xếp
          <select
            aria-label="Sắp xếp tệp"
            value={state.sort}
            disabled={disabled}
            onChange={(e) =>
              void run({
                type: 'sort',
                sort: e.target.value as 'name' | 'type',
              })
            }
          >
            <option value="name">Theo tên</option>
            <option value="type">Theo loại tệp</option>
          </select>
        </label>
        {state.query && (
          <button
            type="button"
            className="soft-button"
            disabled={disabled}
            onClick={() => void run({ type: 'search', query: '' })}
          >
            Bỏ tìm kiếm
          </button>
        )}
      </form>
      <div className="explorer-body">
        <aside className="folder-tree" aria-label="Cây thư mục">
          <button
            className={`tree-folder ${state.currentId === ROOT_ID && !trash ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => void run({ type: 'open', id: ROOT_ID })}
            onDragOver={(e) => {
              if (drag.current) {
                e.preventDefault();
                setDrop(ROOT_ID);
              }
            }}
            onDrop={(e) => transfer(e, ROOT_ID)}
          >
            <Sprite atlas="15" name="desktop_monitor" />
            <span>Máy tính</span>
          </button>
          {tree(ROOT_ID)}
          <button
            className={`tree-folder trash-link ${trash ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => {
              setSelected(null);
              void run({ type: 'trash' });
            }}
          >
            <Sprite atlas="15" name="recycle_bin" />
            <span>Thùng rác</span>
          </button>
        </aside>
        <div
          className={`file-grid ${drop === state.currentId ? 'drop-target' : ''}`}
          aria-label="Lưới tệp"
          onContextMenu={(e) => context(e, null)}
          onDragOver={(e) => {
            if (drag.current && !trash && !disabled) {
              e.preventDefault();
              setDrop(state.currentId);
            }
          }}
          onDragLeave={(e) => {
            if (
              !(e.relatedTarget instanceof Node) ||
              !e.currentTarget.contains(e.relatedTarget)
            )
              setDrop(null);
          }}
          onDrop={(e) => {
            if (!trash) transfer(e, state.currentId);
          }}
        >
          {items.map((n) => (
            <button
              key={n.id}
              data-nodeid={n.id}
              className={`file-item ${selected === n.id ? 'selected' : ''} ${state.clipboard?.mode === 'cut' && state.clipboard.id === n.id ? 'cut-file' : ''} ${drop === n.id ? 'drop-target' : ''}`}
              aria-label={`${n.type === 'folder' ? 'Thư mục' : 'Tệp'} ${n.name}`}
              aria-pressed={selected === n.id}
              disabled={disabled}
              draggable={!disabled && !trash}
              onDragStart={(e) => {
                drag.current = n.id;
                e.dataTransfer.setData('application/x-byte-node', n.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                drag.current = null;
                setDrop(null);
              }}
              onDragOver={(e) => {
                if (
                  n.type === 'folder' &&
                  drag.current &&
                  !trash &&
                  !disabled
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDrop(n.id);
                }
              }}
              onDrop={(e) => {
                if (n.type === 'folder' && !trash) transfer(e, n.id);
              }}
              onClick={() => setSelected(n.id)}
              onDoubleClick={() => {
                if (!trash) {
                  if (n.type === 'folder') void run({ type: 'open', id: n.id });
                  else openDialog('preview', n.id);
                }
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                context(e, n.id);
              }}
            >
              <Sprite atlas="09" name={icon(n)} />
              <strong>{n.name}</strong>
              <small>
                {n.type === 'folder'
                  ? 'Thư mục'
                  : fileFormat(n.fileExtension).label}
              </small>
              {!!state.query && (
                <small>Trong {getNode(state, n.parentId!).name}</small>
              )}
            </button>
          ))}
          {!items.length && (
            <div className="explorer-empty">
              <Sprite
                atlas={trash ? '15' : '09'}
                name={trash ? 'recycle_bin' : 'folder_open_gold'}
              />
              <p>
                {state.query
                  ? 'Không tìm thấy tên phù hợp.'
                  : trash
                    ? 'Thùng rác đang trống.'
                    : 'Thư mục đang trống. Cùng sắp xếp nhé!'}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="explorer-status" role="status">
        <span>
          {items.length} mục{node ? ` · Đã chọn ${node.name}` : ''}
        </span>
        <span>
          {disabled
            ? 'Đang chờ…'
            : state.clipboard
              ? `${state.clipboard.mode === 'cut' ? 'Đã cắt' : 'Đã sao chép'} ${getNode(state, state.clipboard.id).name}`
              : 'Nháy đúp để mở · Kéo vào thư mục để di chuyển'}
        </span>
      </div>
      {node && (
        <div className="selected-actions">
          <button
            className="soft-button"
            disabled={disabled}
            onClick={() => openDialog('info', node.id)}
          >
            <Info size={19} />
            Thông tin tệp
          </button>
          {node.type === 'file' && !trash && (
            <button
              className="soft-button"
              disabled={disabled}
              onClick={() => openDialog('preview', node.id)}
            >
              Xem trước mô phỏng
            </button>
          )}
        </div>
      )}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu chuột phải"
          className="file-context-menu"
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              restoreFocus();
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const buttons = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ) ?? [],
              );
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              buttons[
                (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                  buttons.length
              ]?.focus();
            }
          }}
        >
          {menu.id && !trash && (
            <button
              role="menuitem"
              onClick={() => {
                const n = getNode(state, menu.id!);
                if (n.type === 'folder') void run({ type: 'open', id: n.id });
                else openDialog('preview', n.id);
              }}
            >
              {getNode(state, menu.id).type === 'folder'
                ? 'Mở thư mục'
                : 'Xem trước mô phỏng'}
            </button>
          )}
          {actions
            .filter(
              (a) =>
                menu.id || ['Thư mục mới', 'Dán', 'Hoàn tác'].includes(a.label),
            )
            .map((a) => (
              <button
                role="menuitem"
                key={a.label}
                disabled={disabled || a.disabled}
                onClick={a.action}
              >
                <Sprite atlas="10" name={a.sprite} />
                {a.label}
              </button>
            ))}
          {menu.id && (
            <button
              role="menuitem"
              onClick={() => openDialog('info', menu.id!)}
            >
              Thông tin
            </button>
          )}
        </div>
      )}
      {dialog && (
        <GameModal
          title={
            {
              create: 'Tạo thư mục mới',
              rename: 'Đổi tên',
              delete: 'Đưa vào thùng rác?',
              info: 'Thông tin tệp',
              preview: 'Xem trước mô phỏng',
              move: 'Di chuyển đến thư mục',
            }[dialog.type]
          }
          onClose={() => setDialog(null)}
        >
          {error && (
            <p role="alert" className="simulation-error">
              {error}
            </p>
          )}
          {['create', 'rename'].includes(dialog.type) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  dialog.type === 'create'
                    ? { type: 'create', parentId: state.currentId, name }
                    : { type: 'rename', id: dialog.id!, name },
                ).then((ok) => {
                  if (ok) setDialog(null);
                });
              }}
            >
              <label>
                {dialog.type === 'create' ? 'Tên thư mục mới' : 'Tên mới'}
                <input
                  autoFocus
                  value={name}
                  maxLength={80}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setName(e.target.value);
                  }}
                  onInvalid={(e) =>
                    e.currentTarget.setCustomValidity(
                      'Em hãy nhập tên trước khi lưu nhé.',
                    )
                  }
                  required
                />
              </label>
              {dialogNode?.type === 'file' && (
                <p>Đổi đuôi tệp không chuyển đổi nội dung mô phỏng.</p>
              )}
              <div className="modal-actions">
                <GameButton type="submit" disabled={disabled}>
                  Lưu tên
                </GameButton>
                <button
                  type="button"
                  className="soft-button"
                  onClick={() => setDialog(null)}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
          {dialog.type === 'delete' && dialogNode && (
            <>
              <Sprite
                atlas="10"
                name="action_delete"
                className="dialog-file-icon"
              />
              <p>
                Đưa <strong>{dialogNode.name}</strong> và nội dung bên trong vào
                thùng rác mô phỏng? Em có thể khôi phục lại.
              </p>
              <GameButton
                disabled={disabled}
                onClick={() =>
                  void run({ type: 'delete', id: dialogNode.id }).then((ok) => {
                    if (ok) {
                      setSelected(null);
                      setDialog(null);
                    }
                  })
                }
              >
                <Trash size={20} />
                Đưa vào thùng rác
              </GameButton>
              <button className="soft-button" onClick={() => setDialog(null)}>
                Giữ lại
              </button>
            </>
          )}
          {dialog.type === 'move' && dialogNode && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run({
                  type: 'move',
                  id: dialogNode.id,
                  parentId: destination,
                  via: 'menu',
                }).then((ok) => {
                  if (ok) setDialog(null);
                });
              }}
            >
              <p>Chọn nhà mới cho {dialogNode.name}.</p>
              <label>
                Thư mục đích
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  {state.nodes
                    .filter(
                      (n) => n.type === 'folder' && !isTrashed(state, n.id),
                    )
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                </select>
              </label>
              <GameButton type="submit" disabled={disabled}>
                Di chuyển
              </GameButton>
            </form>
          )}
          {['info', 'preview'].includes(dialog.type) && dialogNode && (
            <div className="file-preview">
              <Sprite atlas="09" name={icon(dialogNode)} />
              <h3>{dialogNode.name}</h3>
              <p>
                {dialogNode.metadata.description ??
                  'Thư mục lưu các tệp và thư mục con.'}
              </p>
              {dialog.type === 'preview' &&
                dialogNode.fileExtension === 'xlsx' && (
                  <table>
                    <caption>Bảng mô phỏng, dữ liệu minh họa</caption>
                    <thead>
                      <tr>
                        <th>Môn học</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Tin học</td>
                        <td>Thực hành quản lý tệp</td>
                      </tr>
                      <tr>
                        <td>Mỹ thuật</td>
                        <td>Chuẩn bị bút màu</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              <dl>
                <dt>Loại</dt>
                <dd>
                  {dialogNode.type === 'folder'
                    ? 'Thư mục'
                    : fileFormat(dialogNode.fileExtension).label}
                </dd>
                <dt>Đuôi tệp</dt>
                <dd>{dialogNode.fileExtension ?? 'Không có'}</dd>
                <dt>Dung lượng mô phỏng</dt>
                <dd>{dialogNode.metadata.bytes ?? 0} byte</dd>
                <dt>Tạo lúc</dt>
                <dd>
                  {new Date(dialogNode.createdAt).toLocaleString('vi-VN')}
                </dd>
                <dt>Cập nhật</dt>
                <dd>
                  {new Date(dialogNode.updatedAt).toLocaleString('vi-VN')}
                </dd>
              </dl>
              <p className="simulation-note">
                Đây là bản xem mô phỏng. Không mở trình soạn thảo hoặc tệp thật
                trên máy.
              </p>
              <button className="soft-button" onClick={() => setDialog(null)}>
                <X size={18} />
                Đóng bản xem
              </button>
            </div>
          )}
        </GameModal>
      )}
      <div className="explorer-mobile-tip">
        <FolderPlus size={18} />
        Trên màn hình nhỏ, dùng Cắt/Dán hoặc Di chuyển để sắp xếp tệp.
      </div>
    </div>
  );
}
