import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Cpu,
  Pause,
  Pin,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react';
import { TILE_MEDIA_ASSETS } from '../data/launcherDefaults';
import type { AppDefinition, LauncherConfig } from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface MiniAppOverlayProps {
  app: AppDefinition;
  config: LauncherConfig;
  now: Date;
  isPinned: boolean;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onClose: () => void;
  onTogglePin: (app: AppDefinition) => void;
  onOpenTileInspector: (app: AppDefinition) => void;
}

export const MiniAppOverlay: React.FC<MiniAppOverlayProps> = ({
  app,
  config,
  now,
  isPinned,
  isMusicPlaying,
  onToggleMusic,
  onClose,
  onTogglePin,
  onOpenTileInspector,
}) => {
  // Camera mini-app state
  const [focalLength, setFocalLength] = useState<'24mm' | '50mm' | '85mm'>('24mm');
  const [shutterFlash, setShutterFlash] = useState(false);
  const [shotCount, setShotCount] = useState(1428);

  // Calculator mini-app state
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcResetNext, setCalcResetNext] = useState(false);

  // Notes mini-app state
  const [noteText, setNoteText] = useState(
    'OnePlus 15R Launcher Setup:\n- 4-col Metro grid with 14px squircles\n- Hasselblad 24mm street profile\n- Live tiles synced to OxygenOS 16'
  );

  // Music track switcher
  const [trackIdx, setTrackIdx] = useState(0);
  const tracks = [
    { title: 'Midnight Concrete', artist: 'Nils Frahm · Lossless 24-bit', duration: '4:18' },
    { title: 'Glass Atrium', artist: 'Ólafur Arnalds · Spatial', duration: '3:52' },
    { title: '15R Pulse Study', artist: 'Kiasmos · Studio Master', duration: '5:04' },
  ];

  const handleShutter = () => {
    setShutterFlash(true);
    setShotCount((c) => c + 1);
    window.setTimeout(() => setShutterFlash(false), 180);
  };

  const handleCalcDigit = (d: string) => {
    if (calcResetNext || calcDisplay === '0') {
      setCalcDisplay(d);
      setCalcResetNext(false);
    } else {
      setCalcDisplay((prev) => (prev.length < 10 ? prev + d : prev));
    }
  };

  const handleCalcOp = (op: string) => {
    const current = parseFloat(calcDisplay);
    if (calcPrev !== null && calcOp && !calcResetNext) {
      const res = computeCalc(calcPrev, current, calcOp);
      setCalcDisplay(String(res).slice(0, 10));
      setCalcPrev(res);
    } else {
      setCalcPrev(current);
    }
    setCalcOp(op);
    setCalcResetNext(true);
  };

  const handleCalcEquals = () => {
    if (calcPrev === null || !calcOp) return;
    const current = parseFloat(calcDisplay);
    const res = computeCalc(calcPrev, current, calcOp);
    setCalcDisplay(String(res).slice(0, 10));
    setCalcPrev(null);
    setCalcOp(null);
    setCalcResetNext(true);
  };

  const computeCalc = (a: number, b: number, op: string): number => {
    if (op === '+') return Number((a + b).toFixed(6));
    if (op === '-') return Number((a - b).toFixed(6));
    if (op === '×') return Number((a * b).toFixed(6));
    if (op === '÷') return b === 0 ? 0 : Number((a / b).toFixed(6));
    return b;
  };

  const isLight = config.theme === 'light';

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col ${
        isLight ? 'bg-zinc-50 text-slate-900' : 'bg-zinc-950 text-white'
      }`}
    >
      {/* Top App Bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="min-h-[36px] flex items-center gap-2 text-xs font-semibold hover:opacity-80"
        >
          <ArrowLeft size={16} />
          <span>{app.name}</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isPinned && (
            <button
              type="button"
              onClick={() => onOpenTileInspector(app)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                isLight ? 'bg-slate-200/70 hover:bg-slate-200' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal size={12} />
              <span>Customize</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onTogglePin(app)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white flex items-center gap-1 transition-opacity hover:opacity-90"
            style={{ backgroundColor: config.accentColor }}
          >
            {isPinned ? <Check size={12} /> : <Pin size={12} />}
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>
      </div>

      {/* App Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {app.id === 'camera' && (
          <div className="h-full flex flex-col justify-between gap-3">
            <div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden bg-black border border-white/15">
              <img
                src={TILE_MEDIA_ASSETS.photo}
                alt="Hasselblad viewfinder"
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover transition-transform duration-300 ${
                  focalLength === '50mm'
                    ? 'scale-125'
                    : focalLength === '85mm'
                    ? 'scale-150'
                    : 'scale-100'
                }`}
              />
              {shutterFlash && <div className="absolute inset-0 bg-white/85" />}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono-tabular text-white bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                <span>HASSELBLAD PRO</span>
                <span>50MP · f/1.8 · {focalLength}</span>
              </div>
              <div className="absolute bottom-3 left-3 text-[10px] font-mono-tabular text-white/90 bg-black/55 px-2 py-1 rounded">
                Captures: {shotCount}
              </div>
            </div>

            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-center gap-2">
                {(['24mm', '50mm', '85mm'] as const).map((lens) => (
                  <button
                    key={lens}
                    type="button"
                    onClick={() => setFocalLength(lens)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-medium transition-colors ${
                      focalLength === lens
                        ? 'text-white'
                        : isLight
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                    style={focalLength === lens ? { backgroundColor: config.accentColor } : undefined}
                  >
                    {lens}
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleShutter}
                  aria-label="Capture photo"
                  className="w-16 h-16 rounded-full border-4 border-white/80 flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: config.accentColor }}
                >
                  <Camera size={22} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>
        )}

        {app.id === 'music' && (
          <div className="flex flex-col items-center justify-between h-full py-2 gap-4">
            <div className="w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden shadow-xl border border-white/10">
              <img
                src={TILE_MEDIA_ASSETS.albumArt}
                alt="Album cover"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full text-center space-y-1">
              <h3 className="text-base font-semibold">{tracks[trackIdx].title}</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {tracks[trackIdx].artist}
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: isMusicPlaying ? '62%' : '45%',
                    backgroundColor: config.accentColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono-tabular opacity-60">
                <span>{isMusicPlaying ? '2:38' : '1:54'}</span>
                <span>{tracks[trackIdx].duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pb-2">
              <button
                type="button"
                aria-label="Previous track"
                onClick={() => setTrackIdx((i) => (i - 1 + tracks.length) % tracks.length)}
                className="p-2.5 rounded-full hover:bg-white/10"
              >
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                aria-label={isMusicPlaying ? 'Pause' : 'Play'}
                onClick={onToggleMusic}
                className="w-14 h-14 rounded-full text-white flex items-center justify-center active:scale-95 transition-transform"
                style={{ backgroundColor: config.accentColor }}
              >
                {isMusicPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
              </button>
              <button
                type="button"
                aria-label="Next track"
                onClick={() => setTrackIdx((i) => (i + 1) % tracks.length)}
                className="p-2.5 rounded-full hover:bg-white/10"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        )}

        {app.id === 'calculator' && (
          <div className="h-full flex flex-col justify-end gap-3">
            <div
              className={`p-4 rounded-2xl text-right ${
                isLight ? 'bg-slate-100' : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="text-xs font-mono-tabular opacity-55 h-4">
                {calcPrev !== null ? `${calcPrev} ${calcOp ?? ''}` : ''}
              </div>
              <div className="text-4xl font-mono-tabular font-light tracking-tight truncate">
                {calcDisplay}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
                (btn) => {
                  const isZero = btn === '0';
                  const isOp = ['÷', '×', '-', '+', '='].includes(btn);
                  return (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        if (btn === 'C') {
                          setCalcDisplay('0');
                          setCalcPrev(null);
                          setCalcOp(null);
                        } else if (btn === '±') {
                          setCalcDisplay((d) => String(-parseFloat(d)));
                        } else if (btn === '%') {
                          setCalcDisplay((d) => String(parseFloat(d) / 100));
                        } else if (btn === '=') {
                          handleCalcEquals();
                        } else if (['+', '-', '×', '÷'].includes(btn)) {
                          handleCalcOp(btn);
                        } else if (btn === '.') {
                          if (!calcDisplay.includes('.')) setCalcDisplay((d) => d + '.');
                        } else {
                          handleCalcDigit(btn);
                        }
                      }}
                      className={`${
                        isZero ? 'col-span-2' : ''
                      } h-12 rounded-xl font-mono-tabular text-base font-semibold transition-transform active:scale-95 ${
                        isOp
                          ? 'text-white'
                          : isLight
                          ? 'bg-slate-200/80 text-slate-900 hover:bg-slate-200'
                          : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                      style={isOp ? { backgroundColor: config.accentColor } : undefined}
                    >
                      {btn}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {app.id === 'notes' && (
          <div className="h-full flex flex-col gap-3">
            <div className="text-xs font-medium opacity-60">
              Quick Note · Synced locally
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className={`flex-1 min-h-[260px] w-full p-3.5 rounded-2xl text-sm leading-relaxed resize-none outline-none border ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-white/5 border-white/10 text-white'
              }`}
            />
          </div>
        )}

        {app.id === 'system-15r' && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl text-white space-y-2"
              style={{ backgroundColor: config.accentColor }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-85">Device Hardware</span>
                <Cpu size={16} />
              </div>
              <div className="text-xl font-semibold">OnePlus 15R 5G</div>
              <div className="text-xs opacity-90">OxygenOS 16 · Android 16 · Metro Shell</div>
            </div>

            <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
              {[
                ['Processor', 'Snapdragon 8 Elite (3nm)'],
                ['Display', '6.78" 1.5K LTPO AMOLED · 120Hz'],
                ['Memory', '16 GB LPDDR5X'],
                ['Storage', '370 GB / 512 GB UFS 4.0'],
                ['Battery', '6000 mAh Silicon-Carbon · 88%'],
                ['Charging', '100W SuperVOOC Ready'],
              ].map(([k, v]) => (
                <div key={k} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="opacity-65">{k}</span>
                  <span className="font-mono-tabular font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!['camera', 'music', 'calculator', 'notes', 'system-15r'].includes(app.id) && (
          <div className="py-6 space-y-5">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 flex items-center justify-center shrink-0"
                style={{
                  backgroundColor:
                    config.tileColor !== 'accent'
                      ? config.tileColor
                      : app.defaultColor || config.accentColor,
                  borderRadius: `${Math.min(50, config.tileRadius)}%`,
                }}
              >
                <IconRenderer
                  iconName={app.icon}
                  styleMode={config.iconStyle}
                  scale={1.1}
                  strokeWidth={config.iconStrokeWidth}
                  accentColor={config.accentColor}
                  foregroundColor="#FFFFFF"
                  baseSizePx={30}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{app.name}</h3>
                <p className="text-xs opacity-65 mt-0.5">{app.packageName}</p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="text-xs font-semibold opacity-70">Live Status</div>
              <p className="text-sm">{app.miniAppSummary}</p>
              <div className="text-[11px] font-mono-tabular opacity-60 pt-1">
                Updated {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
