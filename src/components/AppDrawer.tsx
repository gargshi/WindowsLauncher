import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pin, PinOff, Search, SlidersHorizontal } from 'lucide-react';
import type { AppDefinition, LauncherConfig, TileItem } from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface AppDrawerProps {
  apps: AppDefinition[];
  tiles: TileItem[];
  config: LauncherConfig;
  forceDark?: boolean;
  onBackToStart: () => void;
  onLaunchApp: (app: AppDefinition) => void;
  onTogglePin: (app: AppDefinition) => void;
  onInspectAppTile: (app: AppDefinition) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const AppDrawer: React.FC<AppDrawerProps> = ({
  apps,
  tiles,
  config,
  forceDark = true,
  onBackToStart,
  onLaunchApp,
  onTogglePin,
  onInspectAppTile,
}) => {
  const [query, setQuery] = useState('');
  const [showJumpGrid, setShowJumpGrid] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pinnedAppIds = useMemo(() => new Set(tiles.map((t) => t.appId)), [tiles]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter(
        (app) =>
          !q ||
          app.name.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, query]);

  const groupedApps = useMemo(() => {
    const groups: Record<string, AppDefinition[]> = {};
    for (const app of filteredApps) {
      const first = app.name[0]?.toUpperCase() || '#';
      const key = /[A-Z]/.test(first) ? first : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredApps]);

  const availableLetters = useMemo(() => new Set(groupedApps.map(([letter]) => letter)), [groupedApps]);

  const jumpToLetter = (letter: string) => {
    setShowJumpGrid(false);
    const el = sectionRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isLight = forceDark ? false : config.theme === 'light';

  return (
    <div className="relative h-full w-full flex flex-col bg-black">
      {/* Header & Search */}
      <div className="px-4 pt-2 pb-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToStart}
            className={`min-h-[40px] flex items-center gap-2 text-xs font-semibold tracking-tight transition-opacity hover:opacity-80 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            <ArrowLeft size={16} />
            <span>Start Screen</span>
          </button>
          <span
            className={`text-[11px] font-medium ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}
          >
            {apps.length} installed
          </span>
        </div>

        <div className="relative">
          <Search
            size={15}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-zinc-400'
            }`}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps or categories"
            className={`w-full h-10 pl-9 pr-3 text-xs rounded-xl border outline-none transition-colors ${
              isLight
                ? 'bg-white/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
                : 'bg-white/10 border-white/15 text-white placeholder:text-zinc-400 focus:border-white/35'
            }`}
          />
        </div>
      </div>

      {/* Alphabetical List */}
      <div className="flex-1 overflow-y-auto no-scrollbar touch-pan-y px-4 pb-8 space-y-4">
        {groupedApps.length === 0 ? (
          <div className="py-16 text-center">
            <p className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              No matching apps
            </p>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              Try clearing your search filter.
            </p>
          </div>
        ) : (
          groupedApps.map(([letter, items]) => (
            <div
              key={letter}
              ref={(el) => {
                sectionRefs.current[letter] = el;
              }}
              className="space-y-1.5"
            >
              <button
                type="button"
                onClick={() => setShowJumpGrid(true)}
                aria-label={`Open letter jump grid from ${letter}`}
                className="w-8 h-8 flex items-center justify-center text-sm font-semibold transition-transform active:scale-95"
                style={{
                  backgroundColor: config.accentColor,
                  color: '#FFFFFF',
                  borderRadius: `${Math.min(50, config.tileRadius)}%`,
                  fontSize: `${Math.round(14 * (config.fontScale ?? 1))}px`,
                }}
              >
                {letter}
              </button>

              <div className="space-y-1">
                {items.map((app) => {
                  const isPinned = pinnedAppIds.has(app.id);
                  const matchingTile = tiles.find((t) => t.appId === app.id);
                  const rowIcon = matchingTile?.customIcon || app.icon;
                  const isCoreLauncherApp =
                    app.id === 'phone' || app.id === 'messages' || app.id === 'contacts';
                  const wantsOriginalIcon =
                    matchingTile?.iconSource === 'original' ||
                    (matchingTile?.iconSource !== 'launcher' &&
                      (isCoreLauncherApp ? Boolean(config.useOriginalCommunicationIcons) : true));
                  const showNativeIcon = Boolean(
                    app.nativeIconBase64 && !matchingTile?.customIcon && wantsOriginalIcon
                  );

                  return (
                    <div
                      key={app.id}
                      className={`group flex items-center justify-between gap-2 min-h-[48px] px-2 py-1.5 rounded-xl transition-colors ${
                        isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onLaunchApp(app)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left"
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor:
                              config.iconStyle === 'squircle'
                                ? 'transparent'
                                : matchingTile?.customColor ||
                                  (config.tileColor !== 'accent'
                                    ? config.tileColor
                                    : app.defaultColor || config.accentColor),
                            borderRadius: `${Math.min(50, config.tileRadius)}%`,
                          }}
                        >
                          {showNativeIcon && app.nativeIconBase64 ? (
                            <img
                              src={app.nativeIconBase64}
                              alt={`${app.name} icon`}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 object-contain rounded-md"
                            />
                          ) : (
                            <IconRenderer
                              iconName={rowIcon}
                              styleMode={config.iconStyle}
                              scale={0.76}
                              strokeWidth={config.iconStrokeWidth}
                              accentColor={matchingTile?.customColor || config.accentColor}
                              foregroundColor="#FFFFFF"
                              baseSizePx={24}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`font-medium truncate ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                            style={{ fontSize: `${Math.round(14 * (config.fontScale ?? 1))}px` }}
                          >
                            {matchingTile?.customLabel || app.name}
                          </div>
                          <div
                            className={`truncate ${
                              isLight ? 'text-slate-500' : 'text-zinc-400'
                            }`}
                            style={{ fontSize: `${Math.round(11 * (config.fontScale ?? 1))}px` }}
                          >
                            {app.category} {isPinned ? '· Pinned' : ''}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {isPinned && (
                          <button
                            type="button"
                            aria-label={`Customize ${app.name} tile`}
                            onClick={() => onInspectAppTile(app)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              isLight
                                ? 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900'
                                : 'text-zinc-400 hover:bg-white/15 hover:text-white'
                            }`}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={isPinned ? `Unpin ${app.name}` : `Pin ${app.name} to Start`}
                          onClick={() => onTogglePin(app)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isPinned
                              ? 'text-rose-500 hover:bg-rose-500/15'
                              : isLight
                              ? 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900'
                              : 'text-zinc-400 hover:bg-white/15 hover:text-white'
                          }`}
                        >
                          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Windows Phone A-Z Jump Matrix Overlay */}
      {showJumpGrid && (
        <div
          className={`absolute inset-0 z-30 p-5 flex flex-col justify-center backdrop-blur-xl ${
            isLight ? 'bg-white/92 text-slate-900' : 'bg-zinc-950/92 text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-65">
              Jump to Letter
            </span>
            <button
              type="button"
              onClick={() => setShowJumpGrid(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ALPHABET.map((letter) => {
              const active = availableLetters.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!active}
                  onClick={() => jumpToLetter(letter)}
                  className={`h-11 flex items-center justify-center text-base font-semibold transition-all ${
                    active
                      ? 'text-white active:scale-95'
                      : isLight
                      ? 'text-slate-300 bg-slate-100/60 cursor-default'
                      : 'text-zinc-700 bg-white/5 cursor-default'
                  }`}
                  style={{
                    backgroundColor: active ? config.accentColor : undefined,
                    borderRadius: `${Math.min(50, config.tileRadius)}%`,
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
