import React from 'react';
import { ICON_REGISTRY } from '../data/launcherDefaults';
import type { IconName, IconStyle } from '../types/launcher';

interface IconRendererProps {
  iconName: IconName;
  styleMode: IconStyle;
  scale?: number;
  strokeWidth?: number;
  accentColor: string;
  foregroundColor?: string;
  baseSizePx?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  iconName,
  styleMode,
  scale = 1,
  strokeWidth = 1.75,
  accentColor,
  foregroundColor = '#FFFFFF',
  baseSizePx = 28,
}) => {
  const IconComponent = ICON_REGISTRY[iconName]?.component ?? ICON_REGISTRY.layers.component;
  const computedSize = Math.round(baseSizePx * scale);

  if (styleMode === 'squircle') {
    const boxSize = Math.round(computedSize * 1.48);
    return (
      <div
        className="flex items-center justify-center shrink-0 transition-transform duration-150"
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          borderRadius: '28%',
          backgroundColor: accentColor,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.22)',
        }}
      >
        <IconComponent
          size={Math.round(computedSize * 0.84)}
          strokeWidth={strokeWidth}
          color="#FFFFFF"
        />
      </div>
    );
  }

  if (styleMode === 'duotone') {
    const boxSize = Math.round(computedSize * 1.45);
    return (
      <div
        className="flex items-center justify-center shrink-0 rounded-full transition-transform duration-150"
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          backgroundColor: `${accentColor}28`,
          border: `1px solid ${accentColor}55`,
        }}
      >
        <IconComponent
          size={Math.round(computedSize * 0.86)}
          strokeWidth={strokeWidth}
          color={foregroundColor}
        />
      </div>
    );
  }

  if (styleMode === 'framed') {
    const boxSize = Math.round(computedSize * 1.42);
    return (
      <div
        className="flex items-center justify-center shrink-0 transition-transform duration-150"
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          borderRadius: '6px',
          border: `1.5px solid ${foregroundColor}55`,
          backgroundColor: `${foregroundColor}0C`,
        }}
      >
        <IconComponent
          size={Math.round(computedSize * 0.8)}
          strokeWidth={strokeWidth}
          color={foregroundColor}
        />
      </div>
    );
  }

  if (styleMode === 'glyph') {
    return (
      <IconComponent
        size={Math.round(computedSize * 0.92)}
        strokeWidth={Math.max(1.2, strokeWidth - 0.35)}
        color={foregroundColor}
        className="shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
      />
    );
  }

  // 'metro' classic Windows Phone high-contrast vector glyph
  return (
    <IconComponent
      size={computedSize}
      strokeWidth={strokeWidth}
      color={foregroundColor}
      className="shrink-0"
    />
  );
};
