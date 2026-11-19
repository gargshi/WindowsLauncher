import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { CustomizationStudio } from './components/CustomizationStudio';
import { PhonePreview } from './components/PhonePreview';
import {
  APP_CATALOG,
  DEFAULT_CALLING_APPS,
  DEFAULT_CONFIG,
  DEFAULT_TILES,
} from './data/launcherDefaults';
import { usePWAInstall } from './hooks/usePWAInstall';
import type {
  AlertMode,
  AppDefinition,
  CallingAppOption,
  LauncherConfig,
  LauncherPreset,
  PhoneViewMode,
  StudioTab,
  TileItem,
  TileSize,
} from './types/launcher';
import {
  fetchNativeAndroidApps,
  fetchNativeCallingApps,
  isAndroidNativeLauncher,
  launchNativeAndroidApp,
  openAndroidDefaultHomeSettings,
  pickNativeBackgroundImage,
} from './utils/androidLauncherBridge';

const STORAGE_KEY = 'oxygentile_15r_state_v4';
const CUSTOM_BG_STORAGE_KEY = 'oxygentile_custom_bg_v1';

const TILE_SIZE_CYCLE: TileSize[] = ['1x1', '2x1', '2x2', '4x2'];
const CORE_APP_IDS = new Set(APP_CATALOG.map((a) => a.id));

function isSupportedAppId(appId: string): boolean {
  return CORE_APP_IDS.has(appId) || appId.startsWith('android-');
}

function loadCustomBackground(): string | null {
  try {
    return localStorage.getItem(CUSTOM_BG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function loadStoredState(): { config: LauncherConfig; tiles: TileItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: DEFAULT_CONFIG, tiles: DEFAULT_TILES };
    const parsed = JSON.parse(raw);
    const mergedConfig: LauncherConfig = { ...DEFAULT_CONFIG, ...(parsed.config || {}) };
    mergedConfig.tileRadius = Math.min(50, Math.max(0, Number(mergedConfig.tileRadius ?? DEFAULT_CONFIG.tileRadius)));
    const storedTiles: TileItem[] = Array.isArray(parsed.tiles)
      ? parsed.tiles.filter((t: TileItem) => t && isSupportedAppId(t.appId))
      : [];
    return {
      config: mergedConfig,
      tiles: storedTiles.length > 0 ? storedTiles : DEFAULT_TILES,
    };
  } catch {
    return { config: DEFAULT_CONFIG, tiles: DEFAULT_TILES };
  }
}

export default function App() {
  const initial = useMemo(() => loadStoredState(), []);
  const [config, setConfig] = useState<LauncherConfig>(initial.config);
  const [tiles, setTiles] = useState<TileItem[]>(initial.tiles);
  const [customWallpaperImage, setCustomWallpaperImage] = useState<string | null>(() =>
    loadCustomBackground()
  );

  const [viewMode, setViewMode] = useState<PhoneViewMode>('start');
  const [studioTab, setStudioTab] = useState<StudioTab>('layout');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(initial.tiles[0]?.id ?? null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeApp, setActiveApp] = useState<AppDefinition | null>(null);
  const [alertMode, setAlertMode] = useState<AlertMode>('ring');
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [mobileStudioOpen, setMobileStudioOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [apps, setApps] = useState<AppDefinition[]>(APP_CATALOG);
  const [callingApps, setCallingApps] = useState<CallingAppOption[]>(DEFAULT_CALLING_APPS);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isNativeAndroid = useMemo(() => isAndroidNativeLauncher(), []);

  // Load real installed Android apps and calling apps when running inside the compiled APK
  useEffect(() => {
    let active = true;

    fetchNativeAndroidApps().then((nativeApps) => {
      if (!active || !nativeApps || nativeApps.length === 0) return;
      setApps((prev) => {
        const existingPkgs = new Set(prev.map((a) => a.packageName));
        const merged = prev.map((a) => {
          const match = nativeApps.find((n) => n.packageName === a.packageName);
          return match ? { ...a, nativeIconBase64: match.nativeIconBase64 } : a;
        });
        const extras = nativeApps.filter((n) => !existingPkgs.has(n.packageName));
        return [...merged, ...extras];
      });
    });

    fetchNativeCallingApps().then((nativeCalling) => {
      if (!active || !nativeCalling || nativeCalling.length === 0) return;
      setCallingApps(nativeCalling);
    });

    return () => {
      active = false;
    };
  }, [isNativeAndroid]);

  // Keep built-in Phone app synced with selected default calling app
  useEffect(() => {
    const selectedCalling = callingApps.find(
      (c) => c.packageName === config.preferredDialerPackage
    );
    setApps((prev) =>
      prev.map((app) => {
        if (app.id !== 'phone') return app;
        return {
          ...app,
          packageName: config.preferredDialerPackage || 'com.google.android.dialer',
          nativeIconBase64: selectedCalling?.iconBase64 ?? app.nativeIconBase64,
          miniAppSummary: `${selectedCalling?.name || 'Google Phone'} · Recents & VoLTE HD ready`,
        };
      })
    );
  }, [config.preferredDialerPackage, callingApps]);

  // Sync dark/light root class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', config.theme === 'dark');
  }, [config.theme]);

  // Persist launcher configuration & tiles
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, tiles }));
    } catch {
      // Ignore storage quota errors
    }
  }, [config, tiles]);

  // Persist custom Start background image separately
  useEffect(() => {
    try {
      if (customWallpaperImage) {
        localStorage.setItem(CUSTOM_BG_STORAGE_KEY, customWallpaperImage);
      } else {
        localStorage.removeItem(CUSTOM_BG_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [customWallpaperImage]);

  // Live clock tick every 15 seconds
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const handleUpdateConfig = (partial: Partial<LauncherConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectCustomBackgroundImage = (dataUrl: string) => {
    setCustomWallpaperImage(dataUrl);
    setConfig((prev) => ({ ...prev, wallpaperId: 'custom-image' }));
  };

  const handleClearCustomBackgroundImage = () => {
    setCustomWallpaperImage(null);
    setConfig((prev) =>
      prev.wallpaperId === 'custom-image'
        ? { ...prev, wallpaperId: DEFAULT_CONFIG.wallpaperId }
        : prev
    );
  };

  const handlePickNativeBackgroundImage = async (): Promise<{
    handled: boolean;
    picked: boolean;
  }> => {
    if (!isNativeAndroid) return { handled: false, picked: false };
    const res = await pickNativeBackgroundImage();
    if (res.cancelled) {
      return { handled: true, picked: false };
    }
    if (res.dataUrl) {
      handleSelectCustomBackgroundImage(res.dataUrl);
      return { handled: true, picked: true };
    }
    return { handled: false, picked: false };
  };

  const handleUpdateTile = (tileId: string, partial: Partial<TileItem>) => {
    setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, ...partial } : t)));
  };

  const handleApplyTileColorToAll = (color: string) => {
    if (color === 'accent') {
      setConfig((prev) => ({ ...prev, tileColor: 'accent' }));
      setTiles((prev) => prev.map((t) => ({ ...t, customColor: undefined })));
    } else {
      setConfig((prev) => ({ ...prev, tileColor: color }));
      setTiles((prev) => prev.map((t) => ({ ...t, customColor: color })));
    }
  };

  const handleCycleTileSize = (tileId: string) => {
    setTiles((prev) =>
      prev.map((t) => {
        if (t.id !== tileId) return t;
        const idx = TILE_SIZE_CYCLE.indexOf(t.size);
        const nextSize = TILE_SIZE_CYCLE[(idx + 1) % TILE_SIZE_CYCLE.length];
        return { ...t, size: nextSize };
      })
    );
  };

  const handleUnpinTile = (tileId: string) => {
    setTiles((prev) => {
      const remaining = prev
        .filter((t) => t.id !== tileId)
        .sort((a, b) => a.order - b.order)
        .map((t, i) => ({ ...t, order: i }));
      if (selectedTileId === tileId) {
        setSelectedTileId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const handleMoveTile = (tileId: string, dir: -1 | 1) => {
    setTiles((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((t) => t.id === tileId);
      const targetIndex = index + dir;
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return prev;
      const copy = [...sorted];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy.map((t, idx) => ({ ...t, order: idx }));
    });
  };

  const handleTogglePinApp = (app: AppDefinition) => {
    const existing = tiles.find((t) => t.appId === app.id);
    if (existing) {
      handleUnpinTile(existing.id);
      return;
    }
    const newTile: TileItem = {
      id: `tile-${app.id}-${Date.now()}`,
      appId: app.id,
      size: '1x1',
      liveEnabled: false,
      badgeCount: app.badgeCount,
      order: tiles.length,
    };
    setTiles((prev) => [...prev, newTile]);
    setSelectedTileId(newTile.id);
  };

  const handleInspectAppTile = (app: AppDefinition) => {
    const matching = tiles.find((t) => t.appId === app.id);
    if (matching) {
      setSelectedTileId(matching.id);
      setStudioTab('tile');
      setMobileStudioOpen(true);
    }
  };

  const handleSelectTile = (tileId: string) => {
    setSelectedTileId(tileId);
    if (isEditMode) {
      setStudioTab('tile');
    }
  };

  const handleApplyPreset = (preset: LauncherPreset) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setTiles(DEFAULT_TILES);
    setCustomWallpaperImage(null);
    setSelectedTileId(DEFAULT_TILES[0].id);
    setIsEditMode(false);
    setActiveApp(null);
  };

  const handleImportConfigJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'JSON must be an object with config and tiles.' };
      }
      if (parsed.config) {
        setConfig({ ...DEFAULT_CONFIG, ...parsed.config });
      }
      if (Array.isArray(parsed.tiles) && parsed.tiles.length > 0) {
        const validTiles = parsed.tiles.filter((t: TileItem) => t && isSupportedAppId(t.appId));
        const finalTiles = validTiles.length > 0 ? validTiles : DEFAULT_TILES;
        setTiles(finalTiles);
        setSelectedTileId(finalTiles[0].id);
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to parse JSON. Check syntax and try again.' };
    }
  };

  const handleCycleAlertMode = () => {
    const modes: AlertMode[] = ['ring', 'vibrate', 'silent'];
    setAlertMode((prev) => modes[(modes.indexOf(prev) + 1) % modes.length]);
    setShowAlertToast(true);
    window.setTimeout(() => setShowAlertToast(false), 1800);
  };

  const handleLaunchApp = async (app: AppDefinition) => {
    if (app.id === 'customize') {
      setStudioTab('layout');
      setMobileStudioOpen(true);
      return;
    }
    if (isNativeAndroid) {
      const isPhoneApp = app.id === 'phone' || /dialer/i.test(app.packageName);
      const targetPackage =
        app.id === 'phone'
          ? config.preferredDialerPackage || 'com.google.android.dialer'
          : app.packageName;
      const launched = await launchNativeAndroidApp(targetPackage, {
        preferRecents: isPhoneApp,
      });
      if (launched) return;
      // Match installed OnePlus/Android default package if generic package name differs
      const keyword =
        app.id === 'phone'
          ? /dialer|phone/i
          : app.id === 'messages'
          ? /messaging|mms|messages/i
          : app.id === 'contacts'
          ? /contacts/i
          : null;
      if (keyword) {
        const matched = apps.find(
          (candidate) => candidate.id.startsWith('android-') && keyword.test(candidate.packageName)
        );
        if (
          matched &&
          (await launchNativeAndroidApp(matched.packageName, { preferRecents: isPhoneApp }))
        ) {
          return;
        }
      }
    }
    setActiveApp(app);
  };

  const selectedTile = tiles.find((t) => t.id === selectedTileId) ?? null;
  const selectedApp = selectedTile
    ? apps.find((a) => a.id === selectedTile.appId) ?? null
    : null;

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
      {/* Desktop 3-Zone Top Bar */}
      <header className="hidden lg:flex items-center justify-between gap-8 px-8 h-16 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => {
            setActiveApp(null);
            setViewMode('start');
          }}
          className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          OxygenTile
        </button>

        <nav className="flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveApp(null);
              setViewMode('start');
            }}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              viewMode === 'start' && !activeApp
                ? 'text-slate-900 dark:text-white border-current'
                : 'text-slate-500 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Start Screen
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveApp(null);
              setViewMode('apps');
            }}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              viewMode === 'apps'
                ? 'text-slate-900 dark:text-white border-current'
                : 'text-slate-500 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            App Drawer
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('icons')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              studioTab === 'icons'
                ? 'text-slate-900 dark:text-white border-current'
                : 'text-slate-500 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Icon Studio
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('presets')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              studioTab === 'presets'
                ? 'text-slate-900 dark:text-white border-current'
                : 'text-slate-500 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Presets
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveApp(null);
              setViewMode('start');
              setIsEditMode((v) => !v);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: config.accentColor }}
          >
            {isEditMode ? 'Done Editing' : 'Edit Start Grid'}
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto lg:px-8 lg:py-6 flex flex-col lg:flex-row items-stretch gap-8">
        {/* Left Column: Live OnePlus 15R Surface */}
        <section className="w-full lg:w-[410px] shrink-0 flex flex-col items-center justify-center">
          <PhonePreview
            config={config}
            tiles={tiles}
            apps={apps}
            viewMode={viewMode}
            selectedTileId={selectedTileId}
            isEditMode={isEditMode}
            activeApp={activeApp}
            alertMode={alertMode}
            showAlertToast={showAlertToast}
            now={now}
            customWallpaperImage={customWallpaperImage}
            onChangeViewMode={setViewMode}
            onSelectTile={handleSelectTile}
            onToggleEditMode={() => setIsEditMode((v) => !v)}
            onLaunchApp={handleLaunchApp}
            onCloseApp={() => setActiveApp(null)}
            onCycleTileSize={handleCycleTileSize}
            onUnpinTile={handleUnpinTile}
            onMoveTile={handleMoveTile}
            onTogglePinApp={handleTogglePinApp}
            onInspectAppTile={handleInspectAppTile}
            onCycleAlertMode={handleCycleAlertMode}
          />
        </section>

        {/* Right Column: Desktop Deep Customization Workbench */}
        <section className="hidden lg:flex flex-1 min-w-0 flex-col gap-4 h-[790px]">
          <div className="flex items-baseline justify-between gap-4 px-1">
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight text-slate-900 dark:text-white">
                OnePlus 15R Live Tile Workbench
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                <span>6.78-inch LTPO AMOLED</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{config.gridColumns} columns</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{tiles.length} pinned tiles</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">Alert Slider: {alertMode}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <CustomizationStudio
              config={config}
              activeTab={studioTab}
              selectedTile={selectedTile}
              selectedApp={selectedApp}
              tiles={tiles}
              customWallpaperImage={customWallpaperImage}
              onChangeTab={setStudioTab}
              onUpdateConfig={handleUpdateConfig}
              onUpdateTile={handleUpdateTile}
              onUnpinTile={handleUnpinTile}
              onMoveTile={handleMoveTile}
              onApplyPreset={handleApplyPreset}
              onResetDefaults={handleResetDefaults}
              onImportConfigJson={handleImportConfigJson}
              onApplyTileColorToAll={handleApplyTileColorToAll}
              onSelectCustomBackgroundImage={handleSelectCustomBackgroundImage}
              onClearCustomBackgroundImage={handleClearCustomBackgroundImage}
              onPickNativeBackgroundImage={handlePickNativeBackgroundImage}
              canInstallPWA={isInstallable}
              isPWAInstalled={isInstalled}
              onInstallPWA={() => void install()}
              isNativeAndroid={isNativeAndroid}
              onOpenDefaultHomeSettings={() => void openAndroidDefaultHomeSettings()}
              callingApps={callingApps}
            />
          </div>
        </section>
      </main>

      {/* Mobile Customization Bottom Sheet */}
      {mobileStudioOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
          <div className="w-full h-[86dvh] bg-white dark:bg-zinc-950 rounded-t-3xl flex flex-col overflow-hidden border-t border-white/15">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Customize Launcher
              </span>
              <button
                type="button"
                onClick={() => setMobileStudioOpen(false)}
                aria-label="Close customization drawer"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3">
              <CustomizationStudio
                config={config}
                activeTab={studioTab}
                selectedTile={selectedTile}
                selectedApp={selectedApp}
                tiles={tiles}
                customWallpaperImage={customWallpaperImage}
                onChangeTab={setStudioTab}
                onUpdateConfig={handleUpdateConfig}
                onUpdateTile={handleUpdateTile}
                onUnpinTile={handleUnpinTile}
                onMoveTile={handleMoveTile}
                onApplyPreset={handleApplyPreset}
                onResetDefaults={handleResetDefaults}
                onImportConfigJson={handleImportConfigJson}
                onApplyTileColorToAll={handleApplyTileColorToAll}
                onSelectCustomBackgroundImage={handleSelectCustomBackgroundImage}
                onClearCustomBackgroundImage={handleClearCustomBackgroundImage}
                onPickNativeBackgroundImage={handlePickNativeBackgroundImage}
                canInstallPWA={isInstallable}
                isPWAInstalled={isInstalled}
                onInstallPWA={() => void install()}
                isNativeAndroid={isNativeAndroid}
                onOpenDefaultHomeSettings={() => void openAndroidDefaultHomeSettings()}
                callingApps={callingApps}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
