/** Browser features the recording screen needs: wake lock, fullscreen, sharing files. */

/** Keeps the screen on while a take runs. Returns a release function; failures are silent. */
export const keepScreenOn = async (): Promise<() => void> => {
  try {
    const sentinel = await navigator.wakeLock?.request('screen');
    return () => void sentinel?.release();
  } catch {
    return () => undefined;
  }
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
