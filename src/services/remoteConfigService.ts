import remoteConfig from '@react-native-firebase/remote-config';
import { RC_KEYS, RemoteConfigSnapshot } from '../constants/remoteConfigKeys';

// Default values to load instantly before any network fetch
const DEFAULTS: Record<string, string | number | boolean> = {
  [RC_KEYS.app_version]: '1.0.0',
  [RC_KEYS.buildNumber]: '5.18.77.2045178916/2025',
  [RC_KEYS.calling_version]: '2025.1.11.1',
  [RC_KEYS.maintenanceMode]: false,
  [RC_KEYS.maintenanceMessage]: 'We\'re under maintenance. Please try again shortly.',
  [RC_KEYS.RoleSwitchEnabled]: false,
};

let initialized = false;

export async function initRemoteConfig() {
  if (initialized) return;
  try {
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 5_000 : 60 * 60 * 1000, // 5s dev, 1h prod
      fetchTimeOutMillis: 10_000,
    } as any);
    await remoteConfig().setDefaults(DEFAULTS);
    // Try to fetch in background; don\'t block app UI
    try {
      await remoteConfig().fetchAndActivate();
    } catch { /* non-critical */ }
    initialized = true;
  } catch (e) {
    // still expose defaults even if init fails
    initialized = true;
  }
}

export async function refreshRemoteConfig(force = false) {
  try {
    if (force) {
      await remoteConfig().fetch(0);
    }
    await remoteConfig().fetchAndActivate();
  } catch (_) {}
}

// Typed getters
export const rcGetBoolean = (key: string): boolean => {
  try { return remoteConfig().getValue(key).asBoolean(); } catch { return Boolean(DEFAULTS[key]); }
};
export const rcGetString = (key: string): string => {
  try { return remoteConfig().getValue(key).asString(); } catch { return String(DEFAULTS[key] ?? ''); }
};
export const rcGetNumber = (key: string): number => {
  try { return Number(remoteConfig().getValue(key).asString()); } catch { return Number(DEFAULTS[key] ?? 0); }
};

export const getSnapshot = (): RemoteConfigSnapshot => ({
  app_version: rcGetString(RC_KEYS.app_version),
  buildNumber: rcGetString(RC_KEYS.buildNumber),
  calling_version: rcGetString(RC_KEYS.calling_version),
  maintenanceMode: rcGetBoolean(RC_KEYS.maintenanceMode),
  maintenanceMessage: rcGetString(RC_KEYS.maintenanceMessage),
  RoleSwitchEnabled: rcGetBoolean(RC_KEYS.RoleSwitchEnabled),
});

export function onRemoteConfigUpdated(listener: (snapshot: RemoteConfigSnapshot) => void) {
  const unsub = remoteConfig().onConfigUpdated?.(async () => {
    try { await remoteConfig().activate(); } catch {}
    listener(getSnapshot());
  });
  return () => { try { unsub && unsub(); } catch {} };
}
