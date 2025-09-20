// Central source of truth for Remote Config keys and TS types (trimmed to requested set)

export const RC_KEYS = {
  app_version: 'app_version',
  buildNumber: 'buildNumber',
  calling_version: 'calling_version',
  maintenanceMode: 'maintenanceMode',
  maintenanceMessage: 'maintenanceMessage',
  RoleSwitchEnabled: 'RoleSwitchEnabled',
} as const;

export type RemoteConfigKeys = typeof RC_KEYS;

export type RemoteConfigSnapshot = {
  app_version: string;
  buildNumber: string;
  calling_version: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  RoleSwitchEnabled: boolean;
};
