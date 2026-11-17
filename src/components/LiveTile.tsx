import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Maximize2, Pause, Play, SlidersHorizontal, X } from 'lucide-react';
import { TILE_MEDIA_ASSETS } from '../data/launcherDefaults';
import type { AppDefinition, LauncherConfig, TileItem, TileSize } from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface LiveTileProps {
  tile: TileItem;
  app: AppDefinition;
  config: LauncherConfig;
  isSelected: boolean;
  isEditMode: boolean;
  now: Date;
  isMusicPlaying: boolean;
  onToggleMusic: (e: React.MouseEvent) => void;
  onLaunchApp: (app: AppDefinition) => void;
  onSelectTile: (tileId: string) => void;
  onCycleSize: (tileId: string) => void;
  onUnpinTile: (tileId: string) => void;
  onMoveTile: (tileId: string, direction: -1 | 1) => void;
  onLongPressStart: () => void;
}

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(235, 0, 40, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getGridSpanClass(size: TileSize, maxCols: number): string {
  if (size === '4x2') {
    if (maxCols <= 3) return 'col-span-3 row-span-2';
    return 'col-span-4 row-span-2';
  }
  if (size === '2x2') {
    return 'col-span-2 row-span-2';
  }
  if (size === '2x1') {
    return 'col-span-2 row-span-1';
  }
  return 'col-span-1 row-span-1';
}

export const LiveTile: React.FC<LiveTileProps> = ({
  tile,
  app,
  config,
  isSelected,
  isEditMode,
  now,
  isMusicPlaying,
  onToggleMusic,
  onLaunchApp,
  onSelectTile,
  onCycleSize,
  onUnpinTile,
  onMoveTile,
  onLongPressStart,
}) => {
  const [flipFace, setFlipFace] = useState(0);

  const hasLiveFeed = tile.liveEnabled && app.liveFeedType !== 'none' && config.liveAnimation !== 'static';

  useEffect(() => {
    if (!hasLiveFeed) {
      setFlipFace(0);
      return;
    }
    const staggerDelay = (tile.order % 5) * 650;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setFlipFace((prev) => (prev + 1) % 2);
      }, config.liveIntervalMs);
    }, staggerDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [hasLiveFeed, config.liveIntervalMs, tile.order]);

  const hasGlobalTileColor = config.tileColor && config.tileColor !== 'accent';
  const effectiveColor =
    tile.customColor && tile.customColor !== 'accent'
      ? tile.customColor
      : hasGlobalTileColor
      ? config.tileColor
      : app.defaultColor || config.accentColor;

  const effectiveIcon = tile.customIcon || app.icon;
  const effectiveLabel = tile.customLabel ?? app.name;
  const effectiveBadge = tile.badgeCount ?? app.badgeCount;

  // Determine surface background & contrast text
  let backgroundStyle: React.CSSProperties = {};
  let textColor = '#FFFFFF';
  let mutedTextColor = 'rgba(255,255,255,0.72)';
  let borderStyle = 'none';

  if (config.tileSurface === 'solid') {
    backgroundStyle = {
      backgroundColor: effectiveColor,
    };
    if (isLightHex(effectiveColor)) {
      textColor = '#09090B';
      mutedTextColor = 'rgba(9,9,11,0.68)';
    }
  } else if (config.tileSurface === 'glass') {
    const useLightFrosted =
      config.theme === 'light' && !tile.customColor && !hasGlobalTileColor && !app.defaultColor;
    if (useLightFrosted) {
      backgroundStyle = {
        backgroundColor: `rgba(255, 255, 255, ${config.tileOpacity})`,
        backdropFilter: `blur(${config.tileBlur}px)`,
        WebkitBackdropFilter: `blur(${config.tileBlur}px)`,
      };
      textColor = '#0F172A';
      mutedTextColor = 'rgba(15,23,42,0.65)';
      borderStyle = '1px solid rgba(15,23,42,0.08)';
    } else {
      const baseHex = effectiveColor;
      const alpha =
        tile.customColor || hasGlobalTileColor || app.defaultColor
          ? Math.min(0.92, config.tileOpacity)
          : Math.max(0.45, config.tileOpacity * 0.85);
      backgroundStyle = {
        backgroundColor: hexToRgba(baseHex, alpha),
        backdropFilter: `blur(${config.tileBlur}px)`,
        WebkitBackdropFilter: `blur(${config.tileBlur}px)`,
      };
      borderStyle = '1px solid rgba(255,255,255,0.14)';
      if (isLightHex(baseHex)) {
        textColor = '#09090B';
        mutedTextColor = 'rgba(9,9,11,0.72)';
      }
    }
  } else if (config.tileSurface === 'parallax') {
    backgroundStyle = {
      backgroundColor:
        tile.customColor || hasGlobalTileColor
          ? hexToRgba(effectiveColor, Math.min(0.55, config.tileOpacity * 0.5))
          : config.theme === 'light'
          ? `rgba(255,255,255,${Math.min(0.62, config.tileOpacity * 0.65)})`
          : `rgba(18,20,26,${Math.min(0.68, config.tileOpacity * 0.72)})`,
      backdropFilter: `blur(${Math.max(4, config.tileBlur * 0.5)}px)`,
      WebkitBackdropFilter: `blur(${Math.max(4, config.tileBlur * 0.5)}px)`,
    };
    const darkBg = !(config.theme === 'light' && !tile.customColor && !hasGlobalTileColor) && !isLightHex(effectiveColor);
    textColor = darkBg ? '#FFFFFF' : '#09090B';
    mutedTextColor = darkBg ? 'rgba(255,255,255,0.72)' : 'rgba(9,9,11,0.68)';
    borderStyle =
      config.theme === 'light' ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.16)';
  } else {
    // outline wireframe
    backgroundStyle = {
      backgroundColor: config.theme === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(9,9,11,0.38)',
      backdropFilter: `blur(${Math.min(8, config.tileBlur)}px)`,
    };
    textColor = config.theme === 'light' ? '#09090B' : '#FFFFFF';
    mutedTextColor = config.theme === 'light' ? 'rgba(9,9,11,0.65)' : 'rgba(255,255,255,0.65)';
    borderStyle = `1.5px solid ${effectiveColor}`;
  }

  const showLabel =
    config.labelVisibility === 'all' ||
    (config.labelVisibility === 'medium-wide' && tile.size !== '1x1');

  const isSmall = tile.size === '1x1';
  const isWide = tile.size === '2x1' || tile.size === '4x2';
  const baseIconPx = tile.size === '4x2' ? 34 : tile.size === '2x2' ? 32 : isSmall ? 24 : 26;

  // Format real clock & date
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const shortDay = now.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = now.getDate();
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' });

  // Press/Hold detection for Metro Edit Mode
  let pressTimer: number | null = null;
  const handlePointerDown = () => {
    pressTimer = window.setTimeout(() => {
      onLongPressStart();
    }, 520);
  };
  const handlePointerUpOrLeave = () => {
    if (pressTimer) {
      window.clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const renderLiveFrontOrStatic = () => {
    // Specialized rich front face for Clock & Weather 4x2 / 2x2
    if (app.liveFeedType === 'clock-weather' && (tile.size === '4x2' || tile.size === '2x2')) {
      return (
        <div className="relative h-full w-full p-3.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div
                className="font-mono-tabular font-light leading-none tracking-tight"
                style={{ fontSize: tile.size === '4x2' ? '2.25rem' : '1.65rem', color: textColor }}
              >
                {hours}:{minutes}
              </div>
              <div className="text-[11px] font-medium mt-1" style={{ color: mutedTextColor }}>
                {dayName}, {monthShort} {dayNum}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <IconRenderer
                  iconName={effectiveIcon}
                  styleMode="glyph"
                  scale={0.82}
                  strokeWidth={config.iconStrokeWidth}
                  accentColor={config.accentColor}
                  foregroundColor={textColor}
                  baseSizePx={22}
                />
                <span className="font-mono-tabular text-lg font-semibold" style={{ color: textColor }}>
                  21°
                </span>
              </div>
              <div className="text-[10px]" style={{ color: mutedTextColor }}>
                Cupertino · Clear
              </div>
            </div>
          </div>

          {tile.size === '4x2' && (
            <div className="flex items-center justify-between pt-2 border-t border-current/10 text-[10px]" style={{ color: mutedTextColor }}>
              <span>H 23° · L 13°</span>
              <span>UV 4 Moderate</span>
              <span>AQI 22 Good</span>
            </div>
          )}
        </div>
      );
    }

    // Photos Live Tile
    if (app.liveFeedType === 'photos' && tile.liveEnabled && !isSmall) {
      return (
        <div className="relative h-full w-full overflow-hidden">
          <img
            src={TILE_MEDIA_ASSETS.photo}
            alt="Hasselblad architectural capture"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {showLabel && (
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between text-white">
              <span className="text-[11px] font-medium tracking-tight truncate">{effectiveLabel}</span>
              <span className="text-[10px] font-mono-tabular opacity-75">1,428</span>
            </div>
          )}
        </div>
      );
    }

    // Music Live Tile
    if (app.liveFeedType === 'music' && !isSmall) {
      return (
        <div className="relative h-full w-full overflow-hidden">
          <img
            src={TILE_MEDIA_ASSETS.albumArt}
            alt="Now playing cover art"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
          <div className="absolute inset-0 p-2.5 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                {isMusicPlaying ? 'Playing' : 'Paused'}
              </span>
              <button
                type="button"
                aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                onClick={onToggleMusic}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                {isMusicPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
              </button>
            </div>
            <div>
              <div className="text-xs font-semibold truncate">Midnight Concrete</div>
              <div className="text-[10px] opacity-75 truncate">Nils Frahm · Lossless</div>
            </div>
          </div>
        </div>
      );
    }

    // Calendar Live Tile
    if (app.liveFeedType === 'calendar' && tile.liveEnabled && !isSmall) {
      return (
        <div className="relative h-full w-full p-2.5 flex flex-col justify-between">
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-xl font-semibold leading-none" style={{ color: textColor }}>
              {dayNum}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: mutedTextColor }}>
              {shortDay}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color: textColor }}>
              10:30 Design Critique
            </div>
            <div className="text-[10px] truncate" style={{ color: mutedTextColor }}>
              Studio B · 45 min
            </div>
          </div>
        </div>
      );
    }

    // 15R Telemetry Live Tile
    if (app.liveFeedType === 'system-15r' && !isSmall) {
      return (
        <div className="relative h-full w-full p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: mutedTextColor }}>
              OnePlus 15R
            </span>
            <span className="font-mono-tabular text-[11px] font-semibold" style={{ color: textColor }}>
              88%
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold truncate" style={{ color: textColor }}>
              Snapdragon 8 Elite
            </div>
            <div className="text-[10px] font-mono-tabular truncate" style={{ color: mutedTextColor }}>
              120Hz LTPO · 6000 mAh
            </div>
          </div>
        </div>
      );
    }

    // Default Standard Metro Icon Tile Face
    return (
      <div className="relative h-full w-full p-2 flex flex-col justify-between">
        {effectiveBadge && effectiveBadge > 0 && (
          <span
            className="absolute top-1.5 right-2 font-mono-tabular text-[11px] font-bold leading-none"
            style={{ color: textColor }}
          >
            {effectiveBadge}
          </span>
        )}

        <div
          className={`flex-1 flex items-center justify-center ${
            isSmall ? '' : isWide ? 'pb-1' : 'pb-2'
          }`}
        >
          {app.nativeIconBase64 && !tile.customIcon ? (
            <img
              src={app.nativeIconBase64}
              alt={`${effectiveLabel} icon`}
              referrerPolicy="no-referrer"
              style={{
                width: `${Math.round(baseIconPx * config.iconScale * 1.25)}px`,
                height: `${Math.round(baseIconPx * config.iconScale * 1.25)}px`,
              }}
              className="object-contain rounded-lg"
            />
          ) : (
            <IconRenderer
              iconName={effectiveIcon}
              styleMode={config.iconStyle}
              scale={config.iconScale}
              strokeWidth={config.iconStrokeWidth}
              accentColor={config.accentColor}
              foregroundColor={textColor}
              baseSizePx={baseIconPx}
            />
          )}
        </div>

        {showLabel && (
          <div
            className={`w-full truncate leading-tight ${
              config.labelAlignment === 'centered'
                ? 'text-center text-[11px] font-medium'
                : config.labelAlignment === 'uppercase-micro'
                ? 'text-left text-[9px] font-semibold uppercase tracking-wider'
                : 'text-left text-[11px] font-medium'
            }`}
            style={{ color: textColor }}
          >
            {effectiveLabel}
          </div>
        )}
      </div>
    );
  };

  const renderLiveBackFace = () => {
    if (app.liveFeedType === 'messages') {
      return (
        <div className="h-full w-full p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold" style={{ color: mutedTextColor }}>
              Alex Chen
            </span>
            <span className="font-mono-tabular text-[10px] font-bold" style={{ color: textColor }}>
              {effectiveBadge ?? 3}
            </span>
          </div>
          <p className="text-[10px] leading-snug line-clamp-2" style={{ color: textColor }}>
            Sending the 15R RAW night shots now.
          </p>
        </div>
      );
    }

    if (app.liveFeedType === 'mail') {
      return (
        <div className="h-full w-full p-2 flex flex-col justify-between">
          <span className="text-[10px] font-semibold truncate" style={{ color: mutedTextColor }}>
            Inbox · {effectiveBadge ?? 5}
          </span>
          <p className="text-[10px] leading-snug line-clamp-2" style={{ color: textColor }}>
            OxygenOS Beta Build Ready for Review
          </p>
        </div>
      );
    }

    if (app.liveFeedType === 'fitness') {
      return (
        <div className="h-full w-full p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-medium" style={{ color: mutedTextColor }}>
            OHealth Today
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-base font-bold" style={{ color: textColor }}>
              7,420
            </span>
            <span className="text-[10px]" style={{ color: mutedTextColor }}>
              steps · 64 bpm
            </span>
          </div>
        </div>
      );
    }

    if (app.liveFeedType === 'clock-weather') {
      return (
        <div className="h-full w-full p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: textColor }}>
              3-Day Outlook
            </span>
            <span className="text-[10px]" style={{ color: mutedTextColor }}>
              Cupertino, CA
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px]" style={{ color: mutedTextColor }}>Wed</div>
              <div className="font-mono-tabular text-xs font-semibold" style={{ color: textColor }}>22° / 13°</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: mutedTextColor }}>Thu</div>
              <div className="font-mono-tabular text-xs font-semibold" style={{ color: textColor }}>19° / 11°</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: mutedTextColor }}>Fri</div>
              <div className="font-mono-tabular text-xs font-semibold" style={{ color: textColor }}>24° / 14°</div>
            </div>
          </div>
        </div>
      );
    }

    if (app.liveFeedType === 'photos') {
      return (
        <div className="h-full w-full p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedTextColor }}>
            Hasselblad RAW+
          </span>
          <div>
            <div className="text-xs font-semibold" style={{ color: textColor }}>1,428 Photos</div>
            <div className="text-[10px]" style={{ color: mutedTextColor }}>Atrium Twilight · 50MP</div>
          </div>
        </div>
      );
    }

    if (app.liveFeedType === 'calendar') {
      return (
        <div className="h-full w-full p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-medium" style={{ color: mutedTextColor }}>
            Later Today
          </span>
          <div>
            <div className="text-[11px] font-semibold truncate" style={{ color: textColor }}>
              14:00 Kernel Perf Sync
            </div>
            <div className="text-[10px]" style={{ color: mutedTextColor }}>3 events remaining</div>
          </div>
        </div>
      );
    }

    if (app.liveFeedType === 'system-15r') {
      return (
        <div className="h-full w-full p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-medium" style={{ color: mutedTextColor }}>
            Memory & Storage
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-sm font-bold" style={{ color: textColor }}>
              16 GB RAM
            </span>
            <span className="font-mono-tabular text-[10px]" style={{ color: mutedTextColor }}>
              370 / 512 GB
            </span>
          </div>
        </div>
      );
    }

    return renderLiveFrontOrStatic();
  };

  const spanClass = getGridSpanClass(tile.size, config.gridColumns);
  const isFlipped = hasLiveFeed && flipFace === 1;

  return (
    <div
      className={`${spanClass} tile-perspective relative select-none ${
        isEditMode ? 'tile-editing' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${effectiveLabel} live tile`}
        onClick={() => {
          onSelectTile(tile.id);
          if (!isEditMode) {
            onLaunchApp(app);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTile(tile.id);
            if (!isEditMode) onLaunchApp(app);
          }
        }}
        className={`relative h-full w-full overflow-hidden cursor-pointer transition-transform duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          isSelected && isEditMode ? 'ring-2 ring-white/90' : ''
        }`}
        style={{
          ...backgroundStyle,
          borderRadius: `${Math.min(50, Math.max(0, config.tileRadius))}%`,
          border: isSelected ? `2px solid ${config.accentColor}` : borderStyle,
        }}
      >
        {config.liveAnimation === 'flip' && hasLiveFeed ? (
          <div
            className="tile-flip-inner relative h-full w-full"
            style={{
              transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
            }}
          >
            <div className="tile-face absolute inset-0">{renderLiveFrontOrStatic()}</div>
            <div className="tile-face-back absolute inset-0">{renderLiveBackFace()}</div>
          </div>
        ) : config.liveAnimation === 'slide' && hasLiveFeed ? (
          <div className="relative h-full w-full overflow-hidden">
            <div
              className="h-[200%] w-full transition-transform duration-500 ease-out"
              style={{
                transform: isFlipped ? 'translateY(-50%)' : 'translateY(0%)',
              }}
            >
              <div className="h-1/2 w-full">{renderLiveFrontOrStatic()}</div>
              <div className="h-1/2 w-full">{renderLiveBackFace()}</div>
            </div>
          </div>
        ) : (
          renderLiveFrontOrStatic()
        )}
      </div>

      {/* Metro Edit Mode Floating Controls */}
      {isEditMode && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <button
            type="button"
            aria-label={`Unpin ${effectiveLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onUnpinTile(tile.id);
            }}
            className="pointer-events-auto absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-zinc-900 text-white border border-white/25 shadow-md flex items-center justify-center hover:bg-rose-600 transition-colors"
          >
            <X size={12} />
          </button>

          <button
            type="button"
            aria-label={`Inspect ${effectiveLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTile(tile.id);
            }}
            className="pointer-events-auto absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-zinc-900 text-white border border-white/25 shadow-md flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <SlidersHorizontal size={11} />
          </button>

          <div className="pointer-events-auto absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${effectiveLabel} earlier`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveTile(tile.id, -1);
              }}
              className="w-5 h-5 rounded-full bg-zinc-900/95 text-white border border-white/20 flex items-center justify-center hover:bg-zinc-700"
            >
              <ArrowUp size={10} />
            </button>
            <button
              type="button"
              aria-label={`Move ${effectiveLabel} later`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveTile(tile.id, 1);
              }}
              className="w-5 h-5 rounded-full bg-zinc-900/95 text-white border border-white/20 flex items-center justify-center hover:bg-zinc-700"
            >
              <ArrowDown size={10} />
            </button>
          </div>

          <button
            type="button"
            aria-label={`Resize ${effectiveLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onCycleSize(tile.id);
            }}
            className="pointer-events-auto absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-zinc-900 text-white border border-white/25 shadow-md flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <Maximize2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
};
