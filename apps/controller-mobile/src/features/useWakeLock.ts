import { useEffect } from 'react';

/** Keeps the phone screen on while `active` (best effort; unsupported browsers ignore it). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    function acquire() {
      navigator.wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {
          // Denied (e.g. low battery). The game still works.
        });
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}
