/** Browser features the recording screen needs: wake lock, fullscreen, sharing files. */

/**
 * Keeps the screen on until the returned function is called. The browser drops the lock
 * whenever the page is hidden, so it is requested again each time the page comes back.
 * Failures are silent (iOS before 18.4 ignores it inside an installed PWA).
 */
export const keepScreenOn = async (): Promise<() => void> => {
  let sentinel: WakeLockSentinel | undefined;
  let released = false;
  const acquire = async () => {
    try {
      sentinel = await navigator.wakeLock?.request('screen');
    } catch {
      sentinel = undefined;
    }
  };
  const onVisibility = () => {
    if (!released && document.visibilityState === 'visible') void acquire();
  };
  document.addEventListener('visibilitychange', onVisibility);
  await acquire();
  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVisibility);
    void sentinel?.release().catch(() => undefined);
  };
};

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const toggleFullscreen = async (): Promise<void> => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  } catch {
    // Not available (iOS Safari outside a PWA); the UI suggests installing instead.
  }
};

/**
 * Saves a file: the share sheet on phones (iOS "Save Video" puts it in the camera roll),
 * a regular download elsewhere.
 */
export const saveFile = async (blob: Blob, fileName: string): Promise<void> => {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Fall through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
