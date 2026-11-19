import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Grid,
  Image as ImageIcon,
  Layers,
  Moon,
  Palette,
  Phone,
  RotateCcw,
  Sliders,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ACCENT_SWATCHES,
  ICON_REGISTRY,
  LAUNCHER_PRESETS,
  WALLPAPERS,
} from '../data/launcherDefaults';
import type {
  AppDefinition,
  CallingAppOption,
  IconName,
  IconStyle,
  LabelAlignment,
  LabelVisibility,
  LauncherConfig,
  LauncherPreset,
  StudioTab,
  TileItem,
  TileSize,
  TileSurfaceStyle,
} from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface CustomizationStudioProps {
  config: LauncherConfig;
  activeTab: StudioTab;
  selectedTile: TileItem | null;
  selectedApp: AppDefinition | null;
  tiles: TileItem[];
  customWallpaperImage: string | null;
  onChangeTab: (tab: StudioTab) => void;
  onUpdateConfig: (partial: Partial<LauncherConfig>) => void;
  onUpdateTile: (tileId: string, partial: Partial<TileItem>) => void;
  onUnpinTile: (tileId: string) => void;
  onMoveTile: (tileId: string, dir: -1 | 1) => void;
  onApplyPreset: (preset: LauncherPreset) => void;
  onResetDefaults: () => void;
  onImportConfigJson: (jsonStr: string) => { ok: boolean; error?: string };
  onApplyTileColorToAll: (color: string) => void;
  onSelectCustomBackgroundImage: (dataUrl: string) => void;
  onClearCustomBackgroundImage: () => void;
  onPickNativeBackgroundImage: () => Promise<{ handled: boolean; picked: boolean }>;
  canInstallPWA: boolean;
  isPWAInstalled: boolean;
  onInstallPWA: () => void;
  isNativeAndroid: boolean;
  onOpenDefaultHomeSettings: () => void;
  callingApps: CallingAppOption[];
}

function isLightHexColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

async function resizeFileToJpegDataUrl(file: File, maxDim = 1440): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image'));
      el.src = objectUrl;
    });
    const maxEdge = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const scale = maxEdge > maxDim ? maxDim / maxEdge : 1;
    const targetW = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const targetH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const CustomizationStudio: React.FC<CustomizationStudioProps> = ({
  config,
  activeTab,
  selectedTile,
  selectedApp,
  tiles,
  customWallpaperImage,
  onChangeTab,
  onUpdateConfig,
  onUpdateTile,
  onUnpinTile,
  onMoveTile,
  onApplyPreset,
  onResetDefaults,
  onImportConfigJson,
  onApplyTileColorToAll,
  onSelectCustomBackgroundImage,
  onClearCustomBackgroundImage,
  onPickNativeBackgroundImage,
  canInstallPWA,
  isPWAInstalled,
  onInstallPWA,
  isNativeAndroid,
  onOpenDefaultHomeSettings,
  callingApps,
}) => {
  const [importText, setImportText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPickingBg, setIsPickingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const showTempMessage = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(null), 2600);
  };

  const handleChooseCustomPhoto = async () => {
    if (isPickingBg) return;
    setIsPickingBg(true);
    try {
      if (isNativeAndroid) {
        const res = await onPickNativeBackgroundImage();
        if (res.handled) {
          if (res.picked) {
            showTempMessage('Custom Start background photo applied.');
          }
          return;
        }
      }
      bgFileInputRef.current?.click();
    } finally {
      setIsPickingBg(false);
    }
  };

  const handleBackgroundFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeFileToJpegDataUrl(file, 1440);
      onSelectCustomBackgroundImage(dataUrl);
      showTempMessage('Custom Start background photo applied.');
    } catch {
      showTempMessage('Could not load that image. Try a JPEG or PNG photo.');
    }
  };

  const handleCopyJson = async () => {
    const payload = JSON.stringify({ config, tiles }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      showTempMessage('Launcher layout JSON copied to clipboard.');
    } catch {
      showTempMessage('Unable to access clipboard; use Download JSON.');
    }
  };

  const handleDownloadJson = () => {
    const payload = JSON.stringify({ config, tiles }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oneplus-15r-oxygentile-layout.json';
    a.click();
    URL.revokeObjectURL(url);
    showTempMessage('Downloaded launcher layout backup.');
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const res = onImportConfigJson(importText);
    if (res.ok) {
      setImportText('');
      showTempMessage('Layout imported and applied.');
    } else {
      showTempMessage(res.error || 'Invalid JSON format.');
    }
  };

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'layout', label: 'Layout & Grid', icon: <Grid size={15} /> },
    { id: 'icons', label: 'Icon Pack & Type', icon: <Palette size={15} /> },
    { id: 'tile', label: 'Tile Inspector', icon: <Sliders size={15} /> },
    { id: 'presets', label: 'Presets & Backup', icon: <Layers size={15} /> },
  ];

  const iconEntries = Object.entries(ICON_REGISTRY) as [
    IconName,
    { label: string; component: React.ComponentType }
  ][];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      {/* Studio Tab Bar */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-950/80 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Light / Dark Shell Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-950/80 shrink-0">
          <button
            type="button"
            onClick={() => onUpdateConfig({ theme: 'dark' })}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              config.theme === 'dark'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon size={13} />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateConfig({ theme: 'light' })}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              config.theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sun size={13} />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* Workbench Content */}
      <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-7">
        {activeTab === 'layout' && (
          <>
            {/* Grid Geometry */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Grid Density & Geometry
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure column density, tile spacing, and corner curvature for the 6.78-inch LTPO display.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    Start Columns
                  </span>
                  <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                    {config.gridColumns} columns
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {([3, 4, 5, 6] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => onUpdateConfig({ gridColumns: cols })}
                      className={`min-h-[40px] rounded-xl text-xs font-mono-tabular font-semibold border transition-colors ${
                        config.gridColumns === cols
                          ? 'text-white border-transparent'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                      style={
                        config.gridColumns === cols
                          ? { backgroundColor: config.accentColor }
                          : undefined
                      }
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Corner Radius
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {config.tileRadius}%{' '}
                      {config.tileRadius === 0
                        ? '· Sharp Metro'
                        : config.tileRadius >= 45
                        ? '· Circular'
                        : config.tileRadius >= 14
                        ? '· Squircle'
                        : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={config.tileRadius}
                    onChange={(e) => onUpdateConfig({ tileRadius: Number(e.target.value) })}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[0, 15, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => onUpdateConfig({ tileRadius: pct })}
                        className={`min-h-[30px] rounded-lg text-[11px] font-mono-tabular font-medium border transition-colors ${
                          config.tileRadius === pct
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        style={
                          config.tileRadius === pct
                            ? { backgroundColor: config.accentColor }
                            : undefined
                        }
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <label className="space-y-2 block">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Tile Spacing
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {config.tileGap}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={2}
                    value={config.tileGap}
                    onChange={(e) => onUpdateConfig({ tileGap: Number(e.target.value) })}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </label>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Tile Surface Material */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Tile Surface Material
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Switch between opaque Metro blocks, frosted Oxygen glass, wallpaper parallax cutouts, or wireframe outlines.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'glass', label: 'Frosted Glass' },
                    { id: 'solid', label: 'Solid Metro' },
                    { id: 'parallax', label: 'Wallpaper Cut' },
                    { id: 'outline', label: 'Wireframe' },
                  ] as { id: TileSurfaceStyle; label: string }[]
                ).map((surface) => (
                  <button
                    key={surface.id}
                    type="button"
                    onClick={() => onUpdateConfig({ tileSurface: surface.id })}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      config.tileSurface === surface.id
                        ? 'text-white border-transparent'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                    style={
                      config.tileSurface === surface.id
                        ? { backgroundColor: config.accentColor }
                        : undefined
                    }
                  >
                    {surface.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-2 block">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Surface Opacity
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {Math.round(config.tileOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.05}
                    value={config.tileOpacity}
                    onChange={(e) => onUpdateConfig({ tileOpacity: Number(e.target.value) })}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </label>

                <label className="space-y-2 block">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Backdrop Blur
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {config.tileBlur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={2}
                    value={config.tileBlur}
                    onChange={(e) => onUpdateConfig({ tileBlur: Number(e.target.value) })}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </label>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Global Tile Color */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Tile Color
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Set the base color across Start Screen tiles or apply one color uniformly to every tile.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs font-mono-tabular cursor-pointer">
                  <span className="text-slate-500 dark:text-zinc-400">
                    {config.tileColor === 'accent' ? `Accent (${config.accentColor})` : config.tileColor}
                  </span>
                  <input
                    type="color"
                    value={config.tileColor === 'accent' ? config.accentColor : config.tileColor}
                    onChange={(e) => onUpdateConfig({ tileColor: e.target.value })}
                    aria-label="Pick custom global tile color"
                    className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ tileColor: 'accent' })}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-medium border transition-colors ${
                    config.tileColor === 'accent'
                      ? 'text-white border-transparent'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                  style={
                    config.tileColor === 'accent'
                      ? { backgroundColor: config.accentColor }
                      : undefined
                  }
                >
                  Match Accent
                </button>

                {[
                  { name: 'Crimson', hex: '#EB0028' },
                  { name: 'Cobalt', hex: '#0078D4' },
                  { name: 'Emerald', hex: '#0F766E' },
                  { name: 'Amber', hex: '#D97706' },
                  { name: 'Indigo', hex: '#4F46E5' },
                  { name: 'Obsidian', hex: '#18181B' },
                  { name: 'Titanium', hex: '#52525B' },
                ].map((c) => {
                  const active = config.tileColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      aria-label={`Set tile color to ${c.name}`}
                      onClick={() => onUpdateConfig({ tileColor: c.hex })}
                      className={`w-9 h-9 rounded-xl border transition-transform hover:scale-105 ${
                        active
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 border-white'
                          : 'border-slate-300 dark:border-white/15'
                      }`}
                      style={
                        {
                          backgroundColor: c.hex,
                          ...(active ? { '--tw-ring-color': c.hex } : {}),
                        } as React.CSSProperties
                      }
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = config.tileColor === 'accent' ? config.accentColor : config.tileColor;
                    onApplyTileColorToAll(target);
                    showTempMessage('Applied selected color across all Start Screen tiles.');
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Apply color to all tiles
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyTileColorToAll('accent');
                    showTempMessage('Reset tile colors to system accent & app defaults.');
                  }}
                  className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Reset tile colors
                </button>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Start Screen Background */}
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Start Screen Background
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Pick your own photo or custom color, or choose a built-in canvas. Uses Android System Photo Picker (no storage permissions).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isPickingBg}
                    onClick={() => void handleChooseCustomPhoto()}
                    className="min-h-[38px] px-3.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <ImageIcon size={14} />
                    <span>{isPickingBg ? 'Opening...' : 'Choose Photo'}</span>
                  </button>

                  <label className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/15 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                    <input
                      type="color"
                      value={config.customWallpaperColor || '#09090B'}
                      onChange={(e) => {
                        const hex = e.target.value;
                        onUpdateConfig({
                          wallpaperId: 'custom-color',
                          customWallpaperColor: hex,
                          theme: isLightHexColor(hex) ? 'light' : 'dark',
                        });
                      }}
                      aria-label="Pick custom Start background color"
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span>Custom Color</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {customWallpaperImage && (
                  <div
                    className={`relative rounded-xl overflow-hidden border transition-all ${
                      config.wallpaperId === 'custom-image'
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 border-transparent'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                    }`}
                    style={
                      config.wallpaperId === 'custom-image'
                        ? ({ '--tw-ring-color': config.accentColor } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ wallpaperId: 'custom-image' })}
                      className="w-full text-left"
                    >
                      <div
                        className="h-16 w-full"
                        style={{
                          backgroundImage: `url(${customWallpaperImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 text-[11px] font-medium text-slate-800 dark:text-zinc-200 truncate">
                        My Photo
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Remove custom photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearCustomBackgroundImage();
                        showTempMessage('Removed custom Start photo.');
                      }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}

                {config.wallpaperId === 'custom-color' && (
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ wallpaperId: 'custom-color' })}
                    className="group text-left rounded-xl overflow-hidden border ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 border-transparent transition-all"
                    style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                  >
                    <div
                      className="h-16 w-full"
                      style={{ background: config.customWallpaperColor || '#09090B' }}
                    />
                    <div className="px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 text-[11px] font-mono-tabular font-medium text-slate-800 dark:text-zinc-200 truncate">
                      {config.customWallpaperColor || '#09090B'}
                    </div>
                  </button>
                )}

                {WALLPAPERS.map((wp) => {
                  const active = config.wallpaperId === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          wallpaperId: wp.id,
                          theme: wp.themeHint,
                        })
                      }
                      className={`group text-left rounded-xl overflow-hidden border transition-all ${
                        active
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 border-transparent'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                      }`}
                      style={
                        active ? ({ '--tw-ring-color': config.accentColor } as React.CSSProperties) : undefined
                      }
                    >
                      <div
                        className="h-16 w-full"
                        style={
                          wp.kind === 'image'
                            ? {
                                backgroundImage: `url(${wp.value})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : { background: wp.value }
                        }
                      />
                      <div className="px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 text-[11px] font-medium text-slate-800 dark:text-zinc-200 truncate">
                        {wp.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Default Calling App */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Default Calling App
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Defaults to Google Phone Recents. Switch between installed calling apps on your device.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {callingApps.map((dialer) => {
                  const active =
                    (config.preferredDialerPackage || 'com.google.android.dialer') ===
                    dialer.packageName;
                  return (
                    <button
                      key={dialer.packageName}
                      type="button"
                      onClick={() => {
                        onUpdateConfig({ preferredDialerPackage: dialer.packageName });
                        showTempMessage(`Switched Phone tile to ${dialer.name}.`);
                      }}
                      className={`min-h-[48px] px-3 py-2 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors ${
                        active
                          ? 'text-white border-transparent'
                          : 'border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                      style={active ? { backgroundColor: config.accentColor } : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {dialer.iconBase64 ? (
                          <img
                            src={dialer.iconBase64}
                            alt={dialer.name}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-lg object-contain shrink-0"
                          />
                        ) : (
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              active ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'
                            }`}
                          >
                            <Phone size={14} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{dialer.name}</div>
                          <div
                            className={`text-[10px] font-mono-tabular truncate ${
                              active ? 'text-white/80' : 'text-slate-500 dark:text-zinc-400'
                            }`}
                          >
                            {dialer.packageName}
                          </div>
                        </div>
                      </div>
                      {active && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'icons' && (
          <>
            {/* Icon Pack Style */}
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Global Icon Pack Style
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Transforms every app icon across the Start Screen live tiles and alphabetical App Drawer.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(
                  [
                    { id: 'metro', label: 'Metro Glyph' },
                    { id: 'squircle', label: '15R Squircle' },
                    { id: 'duotone', label: 'Duotone Halo' },
                    { id: 'framed', label: 'Framed Box' },
                    { id: 'glyph', label: 'Thin Line' },
                  ] as { id: IconStyle; label: string }[]
                ).map((pack) => {
                  const active = config.iconStyle === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => onUpdateConfig({ iconStyle: pack.id })}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2.5 transition-colors ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-white/10 border-transparent'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                      style={active ? { borderColor: config.accentColor, borderWidth: '1.5px' } : undefined}
                    >
                      <div className="h-10 flex items-center justify-center">
                        <IconRenderer
                          iconName="camera"
                          styleMode={pack.id}
                          scale={0.95}
                          strokeWidth={config.iconStrokeWidth}
                          accentColor={config.accentColor}
                          foregroundColor={active ? '#FFFFFF' : config.theme === 'light' ? '#0F172A' : '#FFFFFF'}
                          baseSizePx={24}
                        />
                      </div>
                      <span className="text-[11px] font-semibold whitespace-nowrap">{pack.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <label className="space-y-2 block">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Icon Scale
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {Math.round(config.iconScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={config.iconScale}
                    onChange={(e) => onUpdateConfig({ iconScale: Number(e.target.value) })}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Icon Stroke Weight
                    </span>
                    <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                      {config.iconStrokeWidth}px
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { val: 1.25, label: 'Thin' },
                      { val: 1.75, label: 'Regular' },
                      { val: 2.25, label: 'Bold' },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => onUpdateConfig({ iconStrokeWidth: s.val })}
                        className={`min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                          config.iconStrokeWidth === s.val
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        style={
                          config.iconStrokeWidth === s.val
                            ? { backgroundColor: config.accentColor }
                            : undefined
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Accent Color */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    System Accent Color
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Drives uncustomized live tiles, letter jump blocks, and OxygenOS highlights.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-mono-tabular cursor-pointer">
                  <span className="text-slate-500 dark:text-zinc-400">{config.accentColor}</span>
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => onUpdateConfig({ accentColor: e.target.value })}
                    aria-label="Pick custom accent hex color"
                    className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ACCENT_SWATCHES.map((swatch) => {
                  const active = config.accentColor.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => onUpdateConfig({ accentColor: swatch.hex })}
                      className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-black/15"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="truncate">{swatch.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* Launcher Typography & Font Size */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Launcher Typography & Font Size
              </h2>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    Font Size
                  </span>
                  <span className="font-mono-tabular text-slate-500 dark:text-zinc-400">
                    {Math.round((config.fontScale ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={config.fontScale ?? 1}
                  onChange={(e) => onUpdateConfig({ fontScale: Number(e.target.value) })}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[
                    { label: 'Small', val: 0.85 },
                    { label: 'Default', val: 1.0 },
                    { label: 'Large', val: 1.15 },
                    { label: 'XL', val: 1.3 },
                  ].map((preset) => {
                    const active = Math.abs((config.fontScale ?? 1) - preset.val) < 0.025;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => onUpdateConfig({ fontScale: preset.val })}
                        className={`min-h-[34px] rounded-lg text-[11px] font-medium border transition-colors ${
                          active
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        style={active ? { backgroundColor: config.accentColor } : undefined}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 block">
                    Label Visibility
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All Tiles' },
                        { id: 'medium-wide', label: '2x1+ Only' },
                        { id: 'hidden', label: 'Icon Only' },
                      ] as { id: LabelVisibility; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateConfig({ labelVisibility: opt.id })}
                        className={`min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                          config.labelVisibility === opt.id
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                        }`}
                        style={
                          config.labelVisibility === opt.id
                            ? { backgroundColor: config.accentColor }
                            : undefined
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 block">
                    Alignment & Case
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'bottom-left', label: 'Metro Left' },
                        { id: 'centered', label: 'Centered' },
                        { id: 'uppercase-micro', label: 'Micro Caps' },
                      ] as { id: LabelAlignment; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateConfig({ labelAlignment: opt.id })}
                        className={`min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                          config.labelAlignment === opt.id
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                        }`}
                        style={
                          config.labelAlignment === opt.id
                            ? { backgroundColor: config.accentColor }
                            : undefined
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'tile' && (
          <>
            {!selectedTile || !selectedApp ? (
              <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/15">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Select any tile on the Start Screen
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-sm mx-auto">
                  Tap a tile on the OnePlus 15R preview or click Edit to customize its dimensions, icon glyph, custom color, label, and live feed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          selectedTile.customColor ||
                          (config.tileColor !== 'accent'
                            ? config.tileColor
                            : selectedApp.defaultColor || config.accentColor),
                        borderRadius: `${Math.min(50, config.tileRadius)}%`,
                      }}
                    >
                      <IconRenderer
                        iconName={selectedTile.customIcon || selectedApp.icon}
                        styleMode={config.iconStyle}
                        scale={0.85}
                        strokeWidth={config.iconStrokeWidth}
                        accentColor={config.accentColor}
                        foregroundColor="#FFFFFF"
                        baseSizePx={24}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                        {selectedTile.customLabel || selectedApp.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                        {selectedApp.packageName} · {selectedTile.size}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveTile(selectedTile.id, -1)}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveTile(selectedTile.id, 1)}
                      className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      Move Down
                    </button>
                    <button
                      type="button"
                      onClick={() => onUnpinTile(selectedTile.id)}
                      aria-label="Unpin selected tile"
                      className="min-h-[38px] px-3 rounded-xl border border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Unpin</span>
                    </button>
                  </div>
                </div>

                {/* Tile Dimensions */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                    Tile Footprint
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['1x1', '2x1', '2x2', '4x2'] as TileSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => onUpdateTile(selectedTile.id, { size: sz })}
                        className={`min-h-[42px] rounded-xl text-xs font-mono-tabular font-semibold border transition-colors ${
                          selectedTile.size === sz
                            ? 'text-white border-transparent'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        style={
                          selectedTile.size === sz
                            ? { backgroundColor: config.accentColor }
                            : undefined
                        }
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label & Live Feed Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                      Custom Tile Label
                    </span>
                    <input
                      type="text"
                      value={selectedTile.customLabel ?? ''}
                      placeholder={selectedApp.name}
                      onChange={(e) =>
                        onUpdateTile(selectedTile.id, {
                          customLabel: e.target.value || undefined,
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Missed / Unread Count
                      </span>
                      {selectedTile.badgeCount !== undefined && (
                        <button
                          type="button"
                          onClick={() => onUpdateTile(selectedTile.id, { badgeCount: undefined })}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      placeholder={String(selectedApp.badgeCount ?? 0)}
                      value={selectedTile.badgeCount ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          onUpdateTile(selectedTile.id, { badgeCount: undefined });
                          return;
                        }
                        const val = Math.max(0, Math.min(999, Number(raw) || 0));
                        onUpdateTile(selectedTile.id, {
                          badgeCount: val,
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl text-xs font-mono-tabular border border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Per-Tile Color Override */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Tile Color Override
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateTile(selectedTile.id, { customColor: undefined })}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Use System Accent
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      '#EB0028',
                      '#0078D4',
                      '#0F766E',
                      '#D97706',
                      '#4F46E5',
                      '#18181B',
                      '#27272A',
                      '#7C2D12',
                    ].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Set tile color ${hex}`}
                        onClick={() => onUpdateTile(selectedTile.id, { customColor: hex })}
                        className={`w-8 h-8 rounded-lg border transition-transform hover:scale-105 ${
                          selectedTile.customColor === hex
                            ? 'ring-2 ring-offset-2 ring-rose-500 border-white'
                            : 'border-white/15'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedTile.customColor || config.accentColor}
                      onChange={(e) =>
                        onUpdateTile(selectedTile.id, { customColor: e.target.value })
                      }
                      aria-label="Custom tile color picker"
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Per-Tile Custom Icon Picker */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Replace App Icon ({iconEntries.length} glyphs)
                    </span>
                    {selectedTile.customIcon && (
                      <button
                        type="button"
                        onClick={() => onUpdateTile(selectedTile.id, { customIcon: undefined })}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        Restore Default Icon
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                    {iconEntries.map(([iconKey, meta]) => {
                      const IconComp = meta.component as React.ComponentType<{ size?: number }>;
                      const active = (selectedTile.customIcon || selectedApp.icon) === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          title={meta.label}
                          aria-label={`Use ${meta.label} icon`}
                          onClick={() => onUpdateTile(selectedTile.id, { customIcon: iconKey })}
                          className={`h-10 rounded-xl border flex items-center justify-center transition-colors ${
                            active
                              ? 'text-white border-transparent'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                          style={active ? { backgroundColor: config.accentColor } : undefined}
                        >
                          <IconComp size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Curated Launcher Profiles
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Switch between classic Lumia Metro and OnePlus 15R Oxygen glass configurations in one tap.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LAUNCHER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onApplyPreset(preset);
                      showTempMessage(`Applied "${preset.name}" profile.`);
                    }}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-left hover:border-slate-400 dark:hover:border-white/25 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {preset.name}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: preset.config.accentColor }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {preset.summary}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            {/* OnePlus 15R Installation & Cloud APK */}
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    OnePlus 15R Install & Cloud APK
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Install as a standalone PWA, package via PWABuilder online, or build the signed Home Launcher APK via GitHub Actions.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isNativeAndroid && (
                    <button
                      type="button"
                      onClick={onOpenDefaultHomeSettings}
                      className="min-h-[38px] px-3.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
                      style={{ backgroundColor: config.accentColor }}
                    >
                      <Smartphone size={14} />
                      <span>Set Default Home App</span>
                    </button>
                  )}

                  {canInstallPWA && !isPWAInstalled && (
                    <button
                      type="button"
                      onClick={onInstallPWA}
                      className="min-h-[38px] px-3.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
                      style={{ backgroundColor: config.accentColor }}
                    >
                      <Download size={14} />
                      <span>Install App</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/60 space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <div className="font-semibold text-slate-800 dark:text-zinc-200">
                  Cloud APK Build Paths Included
                </div>
                <p>
                  1. GitHub Actions workflow included at <code className="font-mono-tabular text-slate-900 dark:text-zinc-200">.github/workflows/build-apk.yml</code> builds a full <code className="font-mono-tabular text-slate-900 dark:text-zinc-200">CATEGORY_HOME</code> Android APK online with real app launching on push.
                </p>
                <p>
                  2. Full Web App Manifest & Service Worker active so you can also wrap the live URL into an APK online at <code className="font-mono-tabular text-slate-900 dark:text-zinc-200">pwabuilder.com</code>.
                </p>
              </div>
            </section>

            <hr className="border-slate-200 dark:border-white/10" />

            <section className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Layout Export & Restore
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Back up your Start Screen tile arrangement and icon overrides as portable JSON.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefaults();
                      showTempMessage('Restored factory OxygenTile defaults.');
                    }}
                    className="min-h-[38px] px-3 rounded-xl border border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste exported OxygenTile JSON here to restore a layout..."
                  rows={4}
                  className="w-full p-3 rounded-xl text-xs font-mono-tabular border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={!importText.trim()}
                  className="min-h-[40px] px-4 rounded-xl text-xs font-semibold text-white disabled:opacity-40 flex items-center gap-1.5 transition-opacity"
                  style={{ backgroundColor: config.accentColor }}
                >
                  <Upload size={13} />
                  <span>Import Layout JSON</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Inline Feedback Bar */}
      {statusMessage && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-xs font-medium text-slate-700 dark:text-zinc-200">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
