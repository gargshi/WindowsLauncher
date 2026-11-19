import React, { useRef } from 'react';
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
  onSelectTile: (tileId: string) => void;
  onToggleEditMode: () => void;
  onLaunchApp: (app: AppDefinition) => void;
  onCloseApp: () => void;
  onCycleTileSize: (tileId: string) => void;
  onUnpinTile: (tileId: string) => void;
  onMoveTile: (tileId: string, dir: -1 | 1) => void;
  onTogglePinApp: (app: AppDefinition) => void;
  onInspectAppTile: (app: AppDefinition) => void;
  onCycleAlertMode: () => void;
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
  onToggleEditMode,
  onLaunchApp,
  onCloseApp,
  onCycleTileSize,
  onUnpinTile,
  onMoveTile,
  onTogglePinApp,
  onInspectAppTile,
  onCycleAlertMode,
}) => {
  const wallpaper = WALLPAPERS.find((w) => w.id === config.wallpaperId) ?? WALLPAPERS[0];
  const isLight = config.theme === 'light';
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const evaluateSwipe = (endX: number, endY: number) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || activeApp) return;
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
    if (e.pointerType === 'touch') return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleScreenPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    evaluateSwipe(e.clientX, e.clientY);
  };

  const handleScreenTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
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
          style={wallpaperStyle}
        >
          {/* Contrast scrim when wallpaper is bright/image */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isLight ? 'bg-white/25' : 'bg-black/25'
            }`}
          />

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
                isLight ? 'text-slate-900' : 'text-white'
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

          {/* Main Screen Content */}
          <div
            className="relative z-10 flex-1 overflow-hidden touch-pan-y"
            onPointerDown={handleScreenPointerDown}
            onPointerUp={handleScreenPointerUp}
            onTouchStart={handleScreenTouchStart}
            onTouchEnd={handleScreenTouchEnd}
          >
            {viewMode === 'start' ? (
              <div className="h-full overflow-y-auto no-scrollbar touch-pan-y px-3.5 pt-3 pb-8">
                {/* Live Tile Dense Grid */}
                <div
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
                        onLaunchApp={onLaunchApp}
                        onSelectTile={onSelectTile}
                        onCycleSize={onCycleTileSize}
                        onUnpinTile={onUnpinTile}
                        onMoveTile={onMoveTile}
                        onLongPressStart={() => {
                          if (!isEditMode) onToggleEditMode();
                        }}
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
                        : isLight
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
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                    style={{ fontSize: `${Math.round(14 * (config.fontScale ?? 1))}px` }}
                  >
                    <span>All apps</span>
                    <span
                      className="w-7 h-7 rounded-full border flex items-center justify-center"
                      style={{
                        borderColor: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <ArrowRight size={14} />
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <AppDrawer
                apps={apps}
                tiles={tiles}
                config={config}
                onBackToStart={() => onChangeViewMode('start')}
                onLaunchApp={onLaunchApp}
                onTogglePin={onTogglePinApp}
                onInspectAppTile={onInspectAppTile}
              />
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
