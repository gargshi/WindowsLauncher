import type { AppDefinition } from '../types/launcher';

interface NativeInstalledApp {
  name: string;
  packageName: string;
  iconBase64?: string;
}

interface LauncherBridgePlugin {
  getInstalledApps: () => Promise<{ apps: NativeInstalledApp[] }>;
  launchApp: (options: { packageName: string }) => Promise<void>;
  openHomeSettings: () => Promise<void>;
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      LauncherBridge?: LauncherBridgePlugin;
    };
  };
}

export function isAndroidNativeLauncher(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as CapacitorWindow).Capacitor;
  return Boolean(cap?.isNativePlatform?.() && cap?.Plugins?.LauncherBridge);
}

export async function fetchNativeAndroidApps(): Promise<AppDefinition[] | null> {
  if (!isAndroidNativeLauncher()) return null;
  try {
    const bridge = (window as CapacitorWindow).Capacitor?.Plugins?.LauncherBridge;
    if (!bridge) return null;
    const res = await bridge.getInstalledApps();
    if (!res?.apps || res.apps.length === 0) return null;

    return res.apps.map((app) => ({
      id: `android-${app.packageName}`,
      name: app.name,
      packageName: app.packageName,
      category: 'Installed',
      icon: 'layers',
      liveFeedType: 'none',
      miniAppSummary: `Installed Android app (${app.packageName})`,
      nativeIconBase64: app.iconBase64,
    }));
  } catch {
    return null;
  }
}

export async function launchNativeAndroidApp(packageName: string): Promise<boolean> {
  if (!isAndroidNativeLauncher()) return false;
  try {
    const bridge = (window as CapacitorWindow).Capacitor?.Plugins?.LauncherBridge;
    if (!bridge) return false;
    await bridge.launchApp({ packageName });
    return true;
  } catch {
    return false;
  }
}

export async function openAndroidDefaultHomeSettings(): Promise<boolean> {
  if (!isAndroidNativeLauncher()) return false;
  try {
    const bridge = (window as CapacitorWindow).Capacitor?.Plugins?.LauncherBridge;
    if (!bridge) return false;
    await bridge.openHomeSettings();
    return true;
  } catch {
    return false;
  }
}
