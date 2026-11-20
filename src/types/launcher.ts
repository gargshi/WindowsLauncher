export type TileSize = '1x1' | '2x1' | '2x2' | '4x2';

export type IconStyle = 'metro' | 'squircle' | 'duotone' | 'glyph' | 'framed';

export type TileSurfaceStyle = 'solid' | 'glass' | 'parallax' | 'outline';

export type LabelVisibility = 'all' | 'medium-wide' | 'hidden';

export type LabelAlignment = 'bottom-left' | 'centered' | 'uppercase-micro';

export type LiveAnimationMode = 'flip' | 'slide' | 'static';

export type AlertMode = 'ring' | 'vibrate' | 'silent';

export type PhoneViewMode = 'start' | 'apps';

export type StudioTab = 'layout' | 'icons' | 'tile' | 'presets';

export type IconName =
  | 'phone'
  | 'message'
  | 'camera'
  | 'gallery'
  | 'music'
  | 'calendar'
  | 'cloud'
  | 'clock'
  | 'mail'
  | 'compass'
  | 'map'
  | 'settings'
  | 'file'
  | 'terminal'
  | 'wallet'
  | 'heart'
  | 'calculator'
  | 'bookmark'
  | 'video'
  | 'headphones'
  | 'radio'
  | 'cpu'
  | 'battery'
  | 'shield'
  | 'globe'
  | 'shopping'
  | 'book'
  | 'mic'
  | 'gamepad'
  | 'zap'
  | 'sun'
  | 'moon'
  | 'layers'
  | 'bell'
  | 'folder'
  | 'activity'
  | 'users'
  | 'sliders';

export type LiveFeedType =
  | 'none'
  | 'clock-weather'
  | 'photos'
  | 'music'
  | 'messages'
  | 'calendar'
  | 'system-15r'
  | 'mail'
  | 'fitness';

export interface AppDefinition {
  id: string;
  name: string;
  packageName: string;
  category: string;
  icon: IconName;
  defaultColor?: string;
  liveFeedType: LiveFeedType;
  badgeCount?: number;
  miniAppSummary: string;
  nativeIconBase64?: string;
}

export interface TileItem {
  id: string;
  appId: string;
  size: TileSize;
  customLabel?: string;
  customIcon?: IconName;
  customColor?: string; // Hex color or 'accent'
  iconSource?: 'launcher' | 'original';
  liveEnabled: boolean;
  badgeCount?: number;
  order: number;
}

export interface WallpaperOption {
  id: string;
  name: string;
  kind: 'image' | 'solid' | 'gradient';
  value: string; // URL or CSS background value
  themeHint: 'dark' | 'light';
}

export interface CallingAppOption {
  name: string;
  packageName: string;
  iconBase64?: string;
}

export interface LauncherConfig {
  theme: 'dark' | 'light';
  accentColor: string;
  tileColor: string; // 'accent' or hex color
  gridColumns: 3 | 4 | 5 | 6;
  tileGap: number; // px: 0 to 16
  tileRadius: number; // percentage: 0 to 50
  tileSurface: TileSurfaceStyle;
  tileOpacity: number; // 0.35 to 1.0
  tileBlur: number; // 0 to 24 px
  liveAnimation: LiveAnimationMode;
  liveIntervalMs: 3500 | 6000 | 10000;
  iconStyle: IconStyle;
  iconScale: number; // 0.75 to 1.25
  iconStrokeWidth: number; // 1.25 | 1.75 | 2.25
  useOriginalCommunicationIcons: boolean;
  labelVisibility: LabelVisibility;
  labelAlignment: LabelAlignment;
  fontScale: number; // 0.8 to 1.4
  wallpaperId: string;
  customWallpaperColor?: string;
  tileWindowMode: boolean;
  swipeTransitionEnabled: boolean;
  showStatusBar: boolean;
  parallaxDepth: boolean;
  preferredDialerPackage: string;
}

export interface LauncherPreset {
  id: string;
  name: string;
  summary: string;
  config: Partial<LauncherConfig>;
  tileOverrides?: Record<string, Partial<TileItem>>;
}
