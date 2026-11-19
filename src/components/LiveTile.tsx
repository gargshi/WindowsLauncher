import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Maximize2, SlidersHorizontal, X } from 'lucide-react';
import type { AppDefinition, LauncherConfig, TileItem, TileSize } from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface LiveTileProps {
  tile: TileItem;
  app: AppDefinition;
  config: LauncherConfig;
  isSelected: boolean;
  isEditMode: boolean;
  wallpaperStyle?: React.CSSProperties;
  displaySize?: { width: number; height: number };
  tilesLayoutKey?: string;
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
  wallpaperStyle,
  displaySize,
  tilesLayoutKey,
  onLaunchApp,
  onSelectTile,
  onCycleSize,
  onUnpinTile,
  onMoveTile,
  onLongPressStart,
}) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [tileOffset, setTileOffset] = useState({ left: 0, top: 0 });
  const isWindowMode = Boolean(config.tileWindowMode && wallpaperStyle);

  useLayoutEffect(() => {
    if (!isWindowMode || !tileRef.current) return;
    const el = tileRef.current;
    setTileOffset({ left: el.offsetLeft, top: el.offsetTop });
  }, [
    isWindowMode,
    config.gridColumns,
    config.tileGap,
    config.fontScale,
    tile.size,
    tile.order,
    displaySize?.width,
    displaySize?.height,
    tilesLayoutKey,
  ]);

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
  let borderStyle = 'none';
  let windowTintColor = 'transparent';

  if (isWindowMode) {
    backgroundStyle = {
      backgroundColor: '#000000',
    };
    const tintAlpha =
      config.tileSurface === 'outline'
        ? 0.08
        : config.tileSurface === 'parallax'
        ? 0.14
        : Math.min(0.52, Math.max(0.14, config.tileOpacity * 0.48));

    if (config.tileSurface === 'parallax' && !tile.customColor && !hasGlobalTileColor) {
      windowTintColor = `rgba(0, 0, 0, ${tintAlpha})`;
    } else {
      windowTintColor = hexToRgba(effectiveColor, tintAlpha);
    }

    if (config.tileSurface === 'outline') {
      borderStyle = `1.5px solid ${effectiveColor}`;
    } else if (config.tileSurface === 'glass' || config.tileSurface === 'parallax') {
      borderStyle = '1px solid rgba(255,255,255,0.16)';
    }
    textColor = '#FFFFFF';
  } else if (config.tileSurface === 'solid') {
    backgroundStyle = {
      backgroundColor: effectiveColor,
    };
    if (isLightHex(effectiveColor)) {
      textColor = '#09090B';
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
    const darkBg =
      !(config.theme === 'light' && !tile.customColor && !hasGlobalTileColor) &&
      !isLightHex(effectiveColor);
    textColor = darkBg ? '#FFFFFF' : '#09090B';
    borderStyle =
      config.theme === 'light' ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.16)';
  } else {
    // outline wireframe
    backgroundStyle = {
      backgroundColor: config.theme === 'light' ? 'rgba(255,255,255,0.28)' : 'rgba(9,9,11,0.38)',
      backdropFilter: `blur(${Math.min(8, config.tileBlur)}px)`,
    };
    textColor = config.theme === 'light' ? '#09090B' : '#FFFFFF';
    borderStyle = `1.5px solid ${effectiveColor}`;
  }

  const showLabel =
    config.labelVisibility === 'all' ||
    (config.labelVisibility === 'medium-wide' && tile.size !== '1x1');

  const isSmall = tile.size === '1x1';
  const isWide = tile.size === '2x1' || tile.size === '4x2';
  const baseIconPx = tile.size === '4x2' ? 34 : tile.size === '2x2' ? 32 : isSmall ? 24 : 26;

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

  const fontScale = config.fontScale ?? 1;

  const renderTileFace = () => {
    const isPhoneOrMessages =
      app.id === 'phone' ||
      app.id === 'messages' ||
      app.icon === 'phone' ||
      app.icon === 'message' ||
      app.liveFeedType === 'messages';
    const hasCount = Boolean(effectiveBadge && effectiveBadge > 0);
    const showInlineCount = isPhoneOrMessages && hasCount;
    const showCornerBadge = !isPhoneOrMessages && hasCount;

    return (
      <div className="relative h-full w-full p-2 flex flex-col justify-between">
        {showCornerBadge && (
          <span
            className="absolute top-1.5 right-2 font-mono-tabular font-bold leading-none"
            style={{ color: textColor, fontSize: `${Math.round(11 * fontScale)}px` }}
          >
            {effectiveBadge}
          </span>
        )}

        <div
          className={`flex-1 flex items-center justify-center ${
            showInlineCount ? (isSmall ? 'gap-1.5' : 'gap-2.5') : ''
          } ${isSmall ? '' : isWide ? 'pb-1' : 'pb-2'}`}
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
              className="object-contain rounded-lg shrink-0"
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

          {showInlineCount && (
            <span
              className="font-mono-tabular font-light leading-none tracking-tight shrink-0"
              style={{
                color: textColor,
                fontSize: `${Math.round((isSmall ? 16 : tile.size === '4x2' ? 28 : 24) * fontScale)}px`,
              }}
            >
              {effectiveBadge}
            </span>
          )}
        </div>

        {showLabel && (
          <div
            className={`w-full truncate leading-tight ${
              config.labelAlignment === 'centered'
                ? 'text-center font-medium'
                : config.labelAlignment === 'uppercase-micro'
                ? 'text-left font-semibold uppercase tracking-wider'
                : 'text-left font-medium'
            }`}
            style={{
              color: textColor,
              fontSize: `${Math.round((config.labelAlignment === 'uppercase-micro' ? 9 : 11) * fontScale)}px`,
            }}
          >
            {effectiveLabel}
          </div>
        )}
      </div>
    );
  };

  const spanClass = getGridSpanClass(tile.size, config.gridColumns);

  return (
    <div
      ref={tileRef}
      className={`${spanClass} relative select-none ${
        isEditMode ? 'tile-editing' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${effectiveLabel} tile`}
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
        {isWindowMode && wallpaperStyle && (
          <>
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                width: displaySize?.width ? `${displaySize.width}px` : '100vw',
                height: displaySize?.height ? `${displaySize.height}px` : '100dvh',
                left: `${-tileOffset.left}px`,
                top: `calc(${-tileOffset.top}px + var(--wp-scroll-y, 0px))`,
                ...wallpaperStyle,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: windowTintColor }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/45 via-transparent to-black/10"
            />
          </>
        )}
        <div className={`relative z-10 h-full w-full ${isWindowMode ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]' : ''}`}>
          {renderTileFace()}
        </div>
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
