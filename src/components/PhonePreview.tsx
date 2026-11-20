import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BatteryCharging,
  Bell,
  BellOff,
  Check,
  Pencil,
  Vibrate,
  Wifi,
} from 'lucide-react';
import { WALLPAPERS } from '../data/launcherDefaults';
import type {
  AlertMode,
  AppDefinition,
  LauncherConfig,
  PhoneViewMode,
  TileItem,
} from '../types/launcher';
import { AppDrawer } from './AppDrawer';
import { LiveTile } from './LiveTile';
import { MiniAppOverlay } from './MiniAppOverlay';

interface PhonePreviewProps {
  config: LauncherConfig;
  tiles: TileItem[];
  apps: AppDefinition[];
  viewMode: PhoneViewMode;
  selectedTileId: string | null;
  isEditMode: boolean;
  activeApp: AppDefinition | null;
  alertMode: AlertMode;
  showAlertToast: boolean;
  now: Date;
  customWallpaperImage: string | null;
  onChangeViewMode: (mode: PhoneViewMode) => void;
  onSelectTile: (tileId: string, openInspector?: boolean) => void;
  onInspectTile: (tileId: string) => void;
  onToggleEditMode: () => void;
  onEnterEditMode: () => void;
  onLaunchApp: (app: AppDefinition) => void;
  onCloseApp: () => void;
  onCycleTileSize: (tileId: string) => void;
  onUnpinTile: (tileId: string) => void;
  onMoveTile: (tileId: string, dir: -1 | 1) => void;
  onReorderTile: (draggedTileId: string, targetIndex: number) => void;
  onTogglePinApp: (app: AppDefinition) => void;
  onInspectAppTile: (app: AppDefinition) => void;
  onCycleAlertMode: () => void;
}

interface DragState {
  tileId: string;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  config,
  tiles,
  apps,
  viewMode,
  selectedTileId,
  isEditMode,
  activeApp,
  alertMode,
  showAlertToast,
  now,
  customWallpaperImage,
  onChangeViewMode,
  onSelectTile,
  onInspectTile,
  onToggleEditMode,
  onEnterEditMode,
  onLaunchApp,
  onCloseApp,
  onCycleTileSize,
  onUnpinTile,
  onMoveTile,
  onReorderTile,
  onTogglePinApp,
  onInspectAppTile,
  onCycleAlertMode,
}) => {
  const wallpaper = WALLPAPERS.find((w) => w.id === config.wallpaperId) ?? WALLPAPERS[0];
  const isLight = config.theme === 'light';
  const isSolidBlackBackdrop = viewMode === 'apps' || Boolean(config.tileWindowMode);
  const useLightUiChrome = !isSolidBlackBackdrop && isLight;

  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const displayAreaRef = useRef<HTMLDivElement | null>(null);
  const startScrollRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: 372,
    height: 730,
  });
  const [dragState, setDragState] = useState<DragState | null>(null);

  const dragStateRef = useRef<DragState | null>(null);
  dragStateRef.current = dragState;

  const lastReorderAtRef = useRef<number>(0);
  const suppressTapUntilRef = useRef<number>(0);
  const sortedTilesRef = useRef<TileItem[]>([]);
  const onReorderTileRef = useRef(onReorderTile);
  onReorderTileRef.current = onReorderTile;

  useLayoutEffect(() => {
    const el = displayAreaRef.current;
    if (!el) return;
    const updateSize = () => {
      setDisplaySize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const computeDropIndex = useCallback(
    (draggedId: string, clientX: number, clientY: number): number | null => {
      const gridEl = gridRef.current;
      if (!gridEl) return null;

      const nodeMap = new Map<string, DOMRect>();
      gridEl.querySelectorAll<HTMLElement>('[data-tile-id]').forEach((el) => {
        const id = el.getAttribute('data-tile-id');
        if (id) nodeMap.set(id, el.getBoundingClientRect());
      });

      const currentSorted = sortedTilesRef.current;
      const selfRect = nodeMap.get(draggedId);

      // Keep current position stable if pointer is still inside the dragged tile's current slot
      if (
        selfRect &&
        clientX >= selfRect.left &&
        clientX <= selfRect.right &&
        clientY >= selfRect.top &&
        clientY <= selfRect.bottom
      ) {
        return null;
      }

      const others = currentSorted
        .filter((t) => t.id !== draggedId)
        .map((t, idx) => ({ id: t.id, idx, rect: nodeMap.get(t.id) }))
        .filter((item): item is { id: string; idx: number; rect: DOMRect } => Boolean(item.rect));

      if (others.length === 0) return null;

      // 1. Check if pointer sits horizontally between two tiles on the same row
      const rowPeers = currentSorted
        .map((t) => ({ id: t.id, rect: nodeMap.get(t.id) }))
        .filter((item): item is { id: string; rect: DOMRect } => Boolean(item.rect))
        .filter((item) => clientY >= item.rect.top - 6 && clientY <= item.rect.bottom + 6)
        .sort((a, b) => a.rect.left - b.rect.left);

      for (let i = 0; i < rowPeers.length - 1; i++) {
        const leftPeer = rowPeers[i];
        const rightPeer = rowPeers[i + 1];
        const gapStart = leftPeer.rect.right - 14;
        const gapEnd = rightPeer.rect.left + 14;
        if (clientX >= gapStart && clientX <= gapEnd) {
          // Pointer is between leftPeer and rightPeer
          if (leftPeer.id === draggedId || rightPeer.id === draggedId) {
            // Already sitting between these two tiles
            return null;
          }
          const rightInOthers = others.find((o) => o.id === rightPeer.id);
          if (rightInOthers) return rightInOthers.idx;
          const leftInOthers = others.find((o) => o.id === leftPeer.id);
          if (leftInOthers) return leftInOthers.idx + 1;
        }
      }

      // 2. Otherwise check directly hovered tile or nearest tile
      let target = others.find(
        (o) =>
          clientX >= o.rect.left &&
          clientX <= o.rect.right &&
          clientY >= o.rect.top &&
          clientY <= o.rect.bottom
      );

      if (!target) {
        let bestDist = Infinity;
        for (const o of others) {
          const dx = Math.max(o.rect.left - clientX, 0, clientX - o.rect.right);
          const dy = Math.max(o.rect.top - clientY, 0, clientY - o.rect.bottom);
          const dist = Math.hypot(dx, dy);
          if (dist < bestDist) {
            bestDist = dist;
            target = o;
          }
        }
      }

      if (!target) return null;

      const r = target.rect;
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const gridWidth = gridEl.clientWidth || 340;

      if (clientY < r.top - 4) return target.idx;
      if (clientY > r.bottom + 4) return target.idx + 1;

      if (r.width > gridWidth * 0.65) {
        return clientY < cy ? target.idx : target.idx + 1;
      }

      return clientX < cx ? target.idx : target.idx + 1;
    },
    []
  );

  // Global drag listeners while a tile is grabbed
  useEffect(() => {
    if (!dragState) return;

    const updateDragPosition = (clientX: number, clientY: number) => {
      setDragState((prev) => (prev ? { ...prev, clientX, clientY } : null));

      // Gentle auto-scroll near top or bottom of Start Screen
      const scrollEl = startScrollRef.current;
      if (scrollEl) {
        const scrollRect = scrollEl.getBoundingClientRect();
        if (clientY < scrollRect.top + 46) {
          scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop - 10);
        } else if (clientY > scrollRect.bottom - 46) {
          scrollEl.scrollTop += 10;
        }
      }

      const nowMs = Date.now();
      if (nowMs - lastReorderAtRef.current < 110) return;

      const current = dragStateRef.current;
      if (!current) return;

      const nextIdx = computeDropIndex(current.tileId, clientX, clientY);
      if (nextIdx !== null) {
        const currentSorted = sortedTilesRef.current;
        const currIdx = currentSorted.findIndex((t) => t.id === current.tileId);
        if (currIdx !== -1 && nextIdx !== currIdx) {
          lastReorderAtRef.current = nowMs;
          onReorderTileRef.current(current.tileId, nextIdx);
        }
      }
    };

    const endDrag = () => {
      suppressTapUntilRef.current = Date.now() + 180;
      setDragState(null);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      updateDragPosition(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      updateDragPosition(t.clientX, t.clientY);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('touchcancel', endDrag);
    };
  }, [Boolean(dragState), computeDropIndex]);

  const handleStartTileDrag = useCallback(
    (tileId: string, clientX: number, clientY: number, rect: DOMRect) => {
      if (!isEditMode) {
        onEnterEditMode();
      }
      onSelectTile(tileId, false);
      swipeStartRef.current = null;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(18);
      }
      setDragState({
        tileId,
        clientX,
        clientY,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        width: rect.width,
        height: rect.height,
      });
    },
    [isEditMode, onEnterEditMode, onSelectTile]
  );

  const shouldSuppressTap = useCallback(() => {
    return Boolean(dragStateRef.current) || Date.now() < suppressTapUntilRef.current;
  }, []);

  const evaluateSwipe = (endX: number, endY: number) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || activeApp || dragStateRef.current || Date.now() < suppressTapUntilRef.current) {
      return;
    }
    const dx = endX - start.x;
    const dy = endY - start.y;
    const dt = Date.now() - start.time;
    if (dt < 800 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (viewMode === 'start' && dx < 0) {
        onChangeViewMode('apps');
      } else if (viewMode === 'apps' && (dx < 0 || dx > 0)) {
        onChangeViewMode('start');
      }
    }
  };

  const handleScreenPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || dragStateRef.current) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleScreenPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    evaluateSwipe(e.clientX, e.clientY);
  };

  const handleScreenTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || dragStateRef.current) {
      swipeStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleScreenTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    evaluateSwipe(touch.clientX, touch.clientY);
  };

  const rowHeightPx =
    config.gridColumns === 3
      ? 108
      : config.gridColumns === 4
      ? 80
      : config.gridColumns === 5
      ? 62
      : 50;

  const gridColsClass =
    config.gridColumns === 3
      ? 'grid-cols-3'
      : config.gridColumns === 5
      ? 'grid-cols-5'
      : config.gridColumns === 6
      ? 'grid-cols-6'
      : 'grid-cols-4';

  const sortedTiles = [...tiles].sort((a, b) => a.order - b.order);
  sortedTilesRef.current = sortedTiles;
  const tilesLayoutKey = sortedTiles.map((t) => `${t.id}:${t.size}:${t.order}`).join('|');
  const pinnedAppIds = new Set(tiles.map((t) => t.appId));

  const timeString = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const wallpaperStyle: React.CSSProperties =
    config.wallpaperId === 'custom-image' && customWallpaperImage
      ? {
          backgroundImage: `url(${customWallpaperImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : config.wallpaperId === 'custom-color'
      ? {
          background: config.customWallpaperColor || '#000000',
        }
      : wallpaper.kind === 'image'
      ? {
          backgroundImage: `url(${wallpaper.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
          background: wallpaper.value,
        };

  const displayBackgroundStyle: React.CSSProperties = isSolidBlackBackdrop
    ? { background: '#000000' }
    : wallpaperStyle;

  const draggedTile = dragState
    ? sortedTiles.find((t) => t.id === dragState.tileId) ?? null
    : null;
  const draggedApp = draggedTile
    ? apps.find((a) => a.id === draggedTile.appId) ?? null
    : null;
  const displayRect = displayAreaRef.current?.getBoundingClientRect();

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* OnePlus 15R Hardware Chassis on Desktop; Full-Screen on Mobile */}
      <div className="relative w-full lg:w-[392px] h-dvh lg:h-[790px] lg:rounded-[46px] lg:p-[10px] lg:bg-gradient-to-b lg:from-zinc-700 lg:via-zinc-800 lg:to-zinc-900 lg:shadow-[0_30px_80px_rgba(0,0,0,0.55)] lg:border lg:border-white/15">
        {/* Desktop Physical Alert Slider on Right Bezel */}
        <button
          type="button"
          onClick={onCycleAlertMode}
          title="OnePlus Alert Slider: Click to switch Ring / Vibrate / Silent"
          aria-label={`Alert slider currently ${alertMode}. Click to switch.`}
          className="hidden lg:flex flex-col items-center justify-center absolute -right-[5px] top-[156px] w-[6px] h-14 rounded-r-md bg-zinc-500 hover:bg-rose-500 transition-colors cursor-pointer z-30 border-y border-r border-white/25"
        >
          <span
            className="w-1 h-4 rounded-full transition-transform duration-200 bg-white"
            style={{
              transform:
                alertMode === 'silent'
                  ? 'translateY(-10px)'
                  : alertMode === 'vibrate'
                  ? 'translateY(0px)'
                  : 'translateY(10px)',
            }}
          />
        </button>

        {/* Desktop Volume & Power Hardware Keys */}
        <div className="hidden lg:block absolute -left-[4px] top-[168px] w-[4px] h-24 rounded-l bg-zinc-600/90" />
        <div className="hidden lg:block absolute -right-[4px] top-[248px] w-[4px] h-16 rounded-r bg-zinc-600/90" />

        {/* Inner AMOLED Display */}
        <div
          className="relative w-full h-full lg:rounded-[38px] overflow-hidden flex flex-col"
          style={displayBackgroundStyle}
        >
          {/* Alert Slider OxygenOS Toast */}
          {showAlertToast && (
            <div
              className={`absolute top-28 right-3 z-50 px-3.5 py-2 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-2 text-xs font-semibold transition-all ${
                isLight
                  ? 'bg-white/95 border-slate-200 text-slate-900'
                  : 'bg-zinc-900/95 border-white/15 text-white'
              }`}
            >
              {alertMode === 'ring' && <Bell size={14} style={{ color: config.accentColor }} />}
              {alertMode === 'vibrate' && (
                <Vibrate size={14} style={{ color: config.accentColor }} />
              )}
              {alertMode === 'silent' && (
                <BellOff size={14} style={{ color: config.accentColor }} />
              )}
              <span className="capitalize">{alertMode}</span>
            </div>
          )}

          {/* Simulated Status Bar + Punch-Hole Camera (Desktop Frame Only) */}
          {config.showStatusBar && (
            <div
              className={`hidden lg:flex relative z-20 px-5 pt-2.5 pb-1.5 items-center justify-between text-[11px] font-mono-tabular font-medium select-none ${
                useLightUiChrome ? 'text-slate-900' : 'text-white'
              }`}
            >
              <span>{timeString}</span>

              {/* OnePlus 15R Centered Punch-Hole Selfie Camera (Desktop frame) */}
              <div className="hidden lg:block w-3.5 h-3.5 rounded-full bg-black border border-zinc-800 shadow-inner" />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCycleAlertMode}
                  aria-label={`Alert mode: ${alertMode}`}
                  className="hover:opacity-75"
                >
                  {alertMode === 'ring' && <Bell size={12} />}
                  {alertMode === 'vibrate' && <Vibrate size={12} />}
                  {alertMode === 'silent' && <BellOff size={12} />}
                </button>
                <span className="text-[10px] font-semibold">5G</span>
                <Wifi size={12} />
                <span className="flex items-center gap-0.5">
                  <BatteryCharging size={13} />
                  <span>88%</span>
                </span>
              </div>
            </div>
          )}

          {/* Main Screen Content (2-Pane Horizontal Track for Sliding Transition) */}
          <div
            ref={displayAreaRef}
            className="relative z-10 flex-1 overflow-hidden touch-pan-y"
            onPointerDown={handleScreenPointerDown}
            onPointerUp={handleScreenPointerUp}
            onTouchStart={handleScreenTouchStart}
            onTouchEnd={handleScreenTouchEnd}
          >
            <div
              className={`flex h-full w-[200%] ${
                config.swipeTransitionEnabled
                  ? 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : ''
              }`}
              style={{
                transform: `translate3d(${viewMode === 'start' ? '0%' : '-50%'}, 0, 0)`,
              }}
            >
              {/* Pane 1: Start Screen */}
              <div
                className="relative w-1/2 h-full shrink-0 overflow-hidden"
                style={config.tileWindowMode ? { background: '#000000' } : wallpaperStyle}
              >
                {!config.tileWindowMode && (
                  <div
                    className={`absolute inset-0 pointer-events-none ${
                      isLight ? 'bg-white/25' : 'bg-black/25'
                    }`}
                  />
                )}

                <div
                  ref={startScrollRef}
                  onScroll={(e) => {
                    e.currentTarget.style.setProperty(
                      '--wp-scroll-y',
                      `${e.currentTarget.scrollTop}px`
                    );
                  }}
                  className={`relative z-10 h-full overflow-y-auto no-scrollbar px-3.5 pt-3 pb-8 ${
                    dragState ? 'touch-none' : 'touch-pan-y'
                  }`}
                >
                  {/* Live Tile Dense Grid */}
                  <div
                    ref={gridRef}
                    className={`grid ${gridColsClass} grid-flow-dense`}
                    style={{
                      gap: `${config.tileGap}px`,
                      gridAutoRows: `${rowHeightPx}px`,
                    }}
                  >
                    {sortedTiles.map((tile) => {
                      const app = apps.find((a) => a.id === tile.appId);
                      if (!app) return null;
                      return (
                        <LiveTile
                          key={tile.id}
                          tile={tile}
                          app={app}
                          config={config}
                          isSelected={selectedTileId === tile.id}
                          isEditMode={isEditMode}
                          isDragPlaceholder={dragState?.tileId === tile.id}
                          wallpaperStyle={wallpaperStyle}
                          displaySize={displaySize}
                          tilesLayoutKey={tilesLayoutKey}
                          onLaunchApp={onLaunchApp}
                          onSelectTile={onSelectTile}
                          onInspectTile={onInspectTile}
                          onCycleSize={onCycleTileSize}
                          onUnpinTile={onUnpinTile}
                          onMoveTile={onMoveTile}
                          onStartTileDrag={handleStartTileDrag}
                          shouldSuppressTap={shouldSuppressTap}
                        />
                      );
                    })}
                  </div>

                  {/* Windows Phone Style Footer Actions */}
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onToggleEditMode}
                      className={`min-h-[40px] px-3 rounded-xl font-medium flex items-center gap-1.5 transition-colors ${
                        isEditMode
                          ? 'text-white'
                          : !config.tileWindowMode && isLight
                          ? 'text-slate-700 hover:bg-slate-900/5'
                          : 'text-zinc-300 hover:bg-white/10'
                      }`}
                      style={{
                        ...(isEditMode ? { backgroundColor: config.accentColor } : {}),
                        fontSize: `${Math.round(12 * (config.fontScale ?? 1))}px`,
                      }}
                    >
                      {isEditMode ? <Check size={13} /> : <Pencil size={12} />}
                      <span>{isEditMode ? 'Done editing' : 'Edit tiles'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onChangeViewMode('apps')}
                      className={`min-h-[44px] px-3 flex items-center gap-2 font-medium transition-opacity hover:opacity-80 ${
                        !config.tileWindowMode && isLight ? 'text-slate-900' : 'text-white'
                      }`}
                      style={{ fontSize: `${Math.round(14 * (config.fontScale ?? 1))}px` }}
                    >
                      <span>All apps</span>
                      <span
                        className="w-7 h-7 rounded-full border flex items-center justify-center"
                        style={{
                          borderColor:
                            !config.tileWindowMode && isLight
                              ? 'rgba(15,23,42,0.35)'
                              : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        <ArrowRight size={14} />
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pane 2: App List (Always Solid Black) */}
              <div className="w-1/2 h-full shrink-0 overflow-hidden bg-black">
                <AppDrawer
                  apps={apps}
                  tiles={tiles}
                  config={config}
                  forceDark={true}
                  isOpen={viewMode === 'apps'}
                  onBackToStart={() => onChangeViewMode('start')}
                  onLaunchApp={onLaunchApp}
                  onTogglePin={onTogglePinApp}
                  onInspectAppTile={onInspectAppTile}
                />
              </div>
            </div>

            {/* Floating Dragged Tile Ghost */}
            {dragState && draggedTile && draggedApp && displayRect && (
              <div
                aria-hidden="true"
                className="absolute z-30 pointer-events-none"
                style={{
                  left: `${dragState.clientX - displayRect.left - dragState.offsetX}px`,
                  top: `${dragState.clientY - displayRect.top - dragState.offsetY}px`,
                  width: `${dragState.width}px`,
                  height: `${dragState.height}px`,
                }}
              >
                <LiveTile
                  tile={draggedTile}
                  app={draggedApp}
                  config={config}
                  isSelected={false}
                  isEditMode={false}
                  isDragGhost={true}
                  wallpaperStyle={wallpaperStyle}
                  displaySize={displaySize}
                  tilesLayoutKey={tilesLayoutKey}
                  onLaunchApp={onLaunchApp}
                  onSelectTile={onSelectTile}
                  onInspectTile={onInspectTile}
                  onCycleSize={onCycleTileSize}
                  onUnpinTile={onUnpinTile}
                  onMoveTile={onMoveTile}
                />
              </div>
            )}

            {/* Simulated Mini-App Screen */}
            {activeApp && (
              <MiniAppOverlay
                app={activeApp}
                config={config}
                now={now}
                isPinned={pinnedAppIds.has(activeApp.id)}
                onClose={onCloseApp}
                onTogglePin={onTogglePinApp}
                onOpenTileInspector={onInspectAppTile}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
