import { useEffect, useState } from 'react';
import { initRemoteConfig, onRemoteConfigUpdated, getSnapshot, refreshRemoteConfig } from '../services/remoteConfigService';

export function useRemoteConfig() {
  const [snapshot, setSnapshot] = useState(getSnapshot());

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initRemoteConfig();
      if (mounted) setSnapshot(getSnapshot());
      // non-blocking refresh in background
      refreshRemoteConfig(false).then(() => {
        if (mounted) setSnapshot(getSnapshot());
      }).catch(() => {});
    })();

    const unsub = onRemoteConfigUpdated((s) => setSnapshot(s));
    return () => { mounted = false; unsub && unsub(); };
  }, []);

  return snapshot;
}
