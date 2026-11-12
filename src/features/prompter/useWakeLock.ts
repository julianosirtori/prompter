import { useEffect } from 'react';
import { keepScreenOn } from '../../media/device';

/** Keeps the screen on while `active`; the lock is released on cleanup even if it arrives late. */
export const useWakeLock = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let release: (() => void) | null = null;
    void keepScreenOn().then((releaseLock) => {
      if (cancelled) releaseLock();
      else release = releaseLock;
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [active]);
};
