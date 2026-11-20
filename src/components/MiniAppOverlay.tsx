import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Pin,
  SlidersHorizontal,
} from 'lucide-react';
import type { AppDefinition, LauncherConfig } from '../types/launcher';
import { IconRenderer } from './IconRenderer';

interface MiniAppOverlayProps {
  app: AppDefinition;
  config: LauncherConfig;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: (app: AppDefinition) => void;
  onOpenTileInspector: (app: AppDefinition) => void;
}

export const MiniAppOverlay: React.FC<MiniAppOverlayProps> = ({
  app,
  config,
  isPinned,
  onClose,
  onTogglePin,
  onOpenTileInspector,
}) => {
  const openedTime = useMemo(
    () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [app.id]
  );
  // Phone mini-app state (defaults to Recents)
  const [phoneTab, setPhoneTab] = useState<'recents' | 'keypad'>('recents');
  const [dialedNumber, setDialedNumber] = useState('');

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
        {app.id === 'phone' ? (
          <div className="h-full flex flex-col gap-4">
            <div
              className={`grid grid-cols-2 p-1 rounded-xl ${
                isLight ? 'bg-slate-200/70' : 'bg-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setPhoneTab('recents')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  phoneTab === 'recents'
                    ? 'text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-300'
                }`}
                style={phoneTab === 'recents' ? { backgroundColor: config.accentColor } : undefined}
              >
                Recents
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('keypad')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  phoneTab === 'keypad'
                    ? 'text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-300'
                }`}
                style={phoneTab === 'keypad' ? { backgroundColor: config.accentColor } : undefined}
              >
                Keypad
              </button>
            </div>

            {phoneTab === 'recents' ? (
              <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                {[
                  { name: 'Studio Desk', type: 'missed', time: '10:42 AM', meta: 'Mobile · Missed' },
                  { name: 'Alex Chen', type: 'incoming', time: 'Yesterday', meta: 'VoLTE HD · 4m 18s' },
                  { name: 'Maya Lin', type: 'outgoing', time: 'Yesterday', meta: '5G · 2m 05s' },
                  { name: 'OnePlus Support', type: 'incoming', time: 'Nov 14', meta: 'Toll Free · 6m 40s' },
                ].map((entry) => (
                  <div key={`${entry.name}-${entry.time}`} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          entry.type === 'missed'
                            ? 'bg-rose-500/15 text-rose-500'
                            : isLight
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-white/10 text-zinc-200'
                        }`}
                      >
                        {entry.type === 'missed' ? (
                          <PhoneMissed size={15} />
                        ) : entry.type === 'incoming' ? (
                          <PhoneIncoming size={15} />
                        ) : (
                          <PhoneOutgoing size={15} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium truncate ${
                            entry.type === 'missed' ? 'text-rose-500' : ''
                          }`}
                        >
                          {entry.name}
                        </div>
                        <div className="text-[11px] opacity-60 truncate">{entry.meta}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-tabular opacity-60 shrink-0">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-end gap-3 pb-2">
                <div className="text-center text-2xl font-mono-tabular tracking-wider min-h-[36px]">
                  {dialedNumber || 'Enter number'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => setDialedNumber((d) => (d.length < 15 ? d + digit : d))}
                      className={`h-12 rounded-xl font-mono-tabular text-base font-semibold transition-transform active:scale-95 ${
                        isLight ? 'bg-slate-200/80 text-slate-900' : 'bg-white/10 text-white'
                      }`}
                    >
                      {digit}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    aria-label="Call number"
                    className="w-14 h-14 rounded-full text-white flex items-center justify-center"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <Phone size={20} />
                  </button>
                  {dialedNumber && (
                    <button
                      type="button"
                      onClick={() => setDialedNumber((d) => d.slice(0, -1))}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-white/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
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
                {app.nativeIconBase64 ? (
                  <img
                    src={app.nativeIconBase64}
                    alt={`${app.name} icon`}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-contain rounded-lg"
                  />
                ) : (
                  <IconRenderer
                    iconName={app.icon}
                    styleMode={config.iconStyle}
                    scale={1.1}
                    strokeWidth={config.iconStrokeWidth}
                    accentColor={config.accentColor}
                    foregroundColor="#FFFFFF"
                    baseSizePx={30}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{app.name}</h3>
                <p className="text-xs opacity-65 mt-0.5 truncate">{app.packageName}</p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="text-xs font-semibold opacity-70">App Info</div>
              <p className="text-sm">{app.miniAppSummary}</p>
              <div className="text-[11px] font-mono-tabular opacity-60 pt-1">
                Updated {openedTime}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
