import { useEffect, useRef, useState } from 'react';
import {
  Minus,
  Square,
  X,
  ArrowsOutSimple,
  CornersOut,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  appDefinitions,
  windowStatus,
  type DesktopCommand,
  type DesktopState,
  type AppId,
  type SimWindow,
} from '@byte/shared';
import { Sprite } from '../../components/ui';
type Geometry = { x: number; y: number; width: number; height: number };
export function ComputerDesktop({
  state,
  disabled,
  onCommand,
}: {
  state: DesktopState;
  disabled: boolean;
  onCommand: (command: DesktopCommand) => Promise<boolean>;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [worldScale, setWorldScale] = useState(1);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const resize = () =>
      setWorldScale(
        Math.min(element.clientWidth / 1000, element.clientHeight / 600),
      );
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => observer.disconnect();
  }, []);
  const [preview, setPreview] = useState<{ id: AppId; rect: Geometry } | null>(
      null,
    ),
    gesture = useRef<{
      id: AppId;
      kind: 'drag' | 'resize';
      x: number;
      y: number;
      original: Geometry;
      next: Geometry;
      scale: number;
    } | null>(null);
  useEffect(() => {
    gesture.current = null;
    setPreview(null);
  }, [disabled, worldScale]);
  function begin(e: React.PointerEvent, id: AppId, kind: 'drag' | 'resize') {
    if (
      disabled ||
      e.button !== 0 ||
      (e.target instanceof Element && e.target.closest('button'))
    )
      return;
    const w = state.windows.find((w) => w.id === id)!;
    if (w.maximized || w.minimized) return;
    e.preventDefault();
    const original = { x: w.x, y: w.y, width: w.width, height: w.height };
    gesture.current = {
      id,
      kind,
      x: e.clientX,
      y: e.clientY,
      original,
      next: original,
      scale: worldScale,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || disabled) return;
    const dx = (e.clientX - g.x) / g.scale,
      dy = (e.clientY - g.y) / g.scale;
    const r = g.original;
    const rect =
      g.kind === 'drag'
        ? {
            ...r,
            x: Math.max(0, Math.min(1000 - r.width, r.x + dx)),
            y: Math.max(0, Math.min(550 - r.height, r.y + dy)),
          }
        : {
            ...r,
            width: Math.max(280, Math.min(1000 - r.x, r.width + dx)),
            height: Math.max(190, Math.min(550 - r.y, r.height + dy)),
          };
    g.next = rect;
    setPreview({ id: g.id, rect });
  }
  function end(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    setPreview(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!g || disabled) return;
    const changed = Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 3;
    if (changed)
      void onCommand(
        g.kind === 'drag'
          ? { type: 'drag', id: g.id, x: g.next.x, y: g.next.y }
          : {
              type: 'resize',
              id: g.id,
              width: g.next.width,
              height: g.next.height,
            },
      );
    else if (state.focused !== g.id)
      void onCommand({ type: 'focus', id: g.id });
  }
  const cancel = () => {
    gesture.current = null;
    setPreview(null);
  };
  const command = (c: DesktopCommand) => {
    if (!disabled) void onCommand(c);
  };
  function windowView(w: SimWindow) {
    if (!w.open || w.minimized) return null;
    const app = appDefinitions.find((a) => a.id === w.id)!;
    const rect = w.maximized
      ? { x: 0, y: 0, width: 1000, height: 550 }
      : preview?.id === w.id
        ? preview.rect
        : w;
    return (
      <section
        key={w.id}
        className={`sim-window ${state.focused === w.id ? 'focused' : 'background'}`}
        aria-label={`Cửa sổ ${app.title}`}
        data-window={w.id}
        data-status={windowStatus(state, w.id)}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex: preview?.id === w.id ? state.sequence + 1 : w.z,
        }}
        onPointerDown={(e) => {
          if (
            !disabled &&
            state.focused !== w.id &&
            !(
              e.target instanceof Element &&
              e.target.closest('.sim-titlebar,button,.window-resizer')
            )
          )
            command({ type: 'focus', id: w.id });
        }}
      >
        <div
          className="sim-titlebar"
          aria-label={`Thanh tiêu đề ${app.title}`}
          onPointerDown={(e) => begin(e, w.id, 'drag')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
        >
          <Sprite atlas={app.atlas} name={app.sprite} />
          <strong>{app.title}</strong>
          <div className="window-buttons">
            <button
              disabled={disabled}
              aria-label={`Thu nhỏ ${app.title}`}
              onClick={() => command({ type: 'minimize', id: w.id })}
            >
              <Minus size={19} />
            </button>
            <button
              disabled={disabled}
              aria-label={`${w.maximized ? 'Khôi phục' : 'Phóng to'} ${app.title}`}
              onClick={() => command({ type: 'maximize', id: w.id })}
            >
              <Square size={17} />
            </button>
            <button
              className="window-close"
              disabled={disabled}
              aria-label={`Đóng ${app.title}`}
              onClick={() => command({ type: 'close', id: w.id })}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="sim-window-content">
          {w.id === 'notes' ? (
            <>
              <span className="window-app-label">ỨNG DỤNG MÔ PHỎNG</span>
              <h2>Ghi chú của em</h2>
              <p>Em đang khám phá cách dùng cửa sổ.</p>
              <ul>
                <li>Kéo thanh tiêu đề để di chuyển.</li>
                <li>Kéo góc dưới để đổi kích thước.</li>
                <li>Thu nhỏ rồi tìm ứng dụng trên thanh tác vụ.</li>
              </ul>
              <p className="simulation-note">
                Trang đọc thực hành. Chưa có chức năng soạn thảo tài liệu.
              </p>
            </>
          ) : (
            <>
              <span className="window-app-label">ALBUM MÔ PHỎNG</span>
              <h2>Những người bạn máy tính</h2>
              <div className="hardware-album">
                {[
                  'desktop_monitor',
                  'mouse_mint_three_quarter',
                  'keyboard_lavender',
                  'printer',
                ].map((sprite) => (
                  <Sprite key={sprite} atlas="03" name={sprite} />
                ))}
              </div>
              <p>
                Thử chuyển qua cửa sổ Ghi chú bằng thanh tiêu đề hoặc thanh tác
                vụ.
              </p>
            </>
          )}
        </div>
        <div className="sim-window-status">
          {Math.round(rect.width)} × {Math.round(rect.height)} ·{' '}
          {state.focused === w.id ? 'Đang làm việc' : 'Ở phía sau'}
        </div>
        {!w.maximized && (
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Đổi kích thước ${app.title}`}
            aria-valuemin={280}
            aria-valuemax={1000 - w.x}
            aria-valuenow={Math.round(rect.width)}
            className="window-resizer"
            onPointerDown={(e) => begin(e, w.id, 'resize')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyDown={(e) => {
              if (disabled) return;
              const delta =
                e.key === 'ArrowRight' ? 30 : e.key === 'ArrowLeft' ? -30 : 0;
              const dy =
                e.key === 'ArrowDown' ? 30 : e.key === 'ArrowUp' ? -30 : 0;
              if (delta || dy) {
                e.preventDefault();
                command({
                  type: 'resize',
                  id: w.id,
                  width: w.width + delta,
                  height: w.height + dy,
                });
              }
            }}
          >
            <ArrowsOutSimple size={19} />
          </div>
        )}
      </section>
    );
  }
  return (
    <div className="computer-workspace">
      <p className="desktop-hint">
        Nháy đúp để mở ứng dụng. Cửa sổ và thanh tác vụ chỉ nằm trong bàn mô
        phỏng và tự vừa theo vùng hiển thị.
      </p>
      <div className="desktop-scroll" ref={surface}>
        <div
          className="desktop-world"
          aria-label="Máy tính mô phỏng"
          style={{ transform: `translate(-50%, -50%) scale(${worldScale})` }}
        >
          <div className="desktop-shortcuts">
            {appDefinitions.map((app) => (
              <button
                key={app.id}
                className="desktop-shortcut"
                disabled={disabled}
                onDoubleClick={() => command({ type: 'launch', id: app.id })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    command({ type: 'launch', id: app.id });
                  }
                }}
                aria-label={`Mở ${app.title}`}
              >
                <Sprite atlas={app.atlas} name={app.sprite} />
                <span>{app.title}</span>
              </button>
            ))}
          </div>
          <div className="desktop-wallpaper">
            <Sprite atlas="15" name="desktop_monitor" />
            <strong>Góc khám phá của em</strong>
            <span>Thử mở hai ứng dụng và sắp xếp cửa sổ nhé!</span>
          </div>
          {state.windows.map(windowView)}
          <div className="sim-taskbar" aria-label="Thanh tác vụ">
            <div className="taskbar-home">
              <Sprite atlas="15" name="application_launcher" />
              <span>BYTE</span>
            </div>
            {state.windows
              .filter((w) => w.open)
              .map((w) => {
                const app = appDefinitions.find((a) => a.id === w.id)!;
                return (
                  <button
                    key={w.id}
                    disabled={disabled}
                    aria-label={`Thanh tác vụ ${app.title}`}
                    aria-pressed={state.focused === w.id && !w.minimized}
                    onClick={() => command({ type: 'taskbar', id: w.id })}
                  >
                    <Sprite atlas={app.atlas} name={app.sprite} />
                    <span>
                      {app.title}
                      {w.minimized ? ' · Thu nhỏ' : ''}
                    </span>
                  </button>
                );
              })}
            <span className="taskbar-label">Máy tính mô phỏng</span>
          </div>
        </div>
      </div>
      <div className="desktop-accessible">
        <span>Điều khiển bằng bàn phím:</span>
        {state.windows
          .filter((w) => w.open && !w.minimized && !w.maximized)
          .map((w) => (
            <button
              className="soft-button"
              key={w.id}
              disabled={disabled}
              onClick={() =>
                command({ type: 'drag', id: w.id, x: w.x + 100, y: w.y })
              }
            >
              <CornersOut size={18} /> Dịch{' '}
              {appDefinitions.find((a) => a.id === w.id)!.title} sang phải
            </button>
          ))}
        <span>
          <ArrowsClockwise size={16} /> Reset bài ở thanh phía trên để bắt đầu
          lại.
        </span>
      </div>
    </div>
  );
}
