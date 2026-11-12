import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraError, openCamera, stopStream, type CameraErrorKind, type CameraRequest } from '../../media/camera';

export type CameraState =
  | { status: 'checking' }
  /** Permission not granted yet: explain before the browser prompt. */
  | { status: 'explain' }
  | { status: 'opening' }
  | { status: 'ready'; stream: MediaStream }
  | { status: 'error'; kind: CameraErrorKind };

const alreadyAllowed = async (): Promise<boolean> => {
  try {
    const names = ['camera', 'microphone'] as const;
    const results = await Promise.all(names.map((name) => navigator.permissions.query({ name: name as PermissionName })));
    return results.every((result) => result.state === 'granted');
  } catch {
    // Safari and Firefox do not answer for camera: fall back to explaining first.
    return false;
  }
};

/**
 * Owns the camera stream for the recording screen. Opens right away when permission was already
 * granted; otherwise waits for `open()` so the explanation comes before the browser prompt.
 * Tracks are always stopped on unmount, and a stream that arrives late is stopped on arrival.
 */
export const useCamera = (enabled: boolean, request: CameraRequest, onFallback: () => void) => {
  const [state, setState] = useState<CameraState>({ status: 'checking' });
  /** `generation` invalidates answers that arrive after a newer request or after unmount. */
  const session = useRef<{ generation: number; stream: MediaStream | null }>({ generation: 0, stream: null });
  const latest = useRef({ request, onFallback });
  useEffect(() => {
    latest.current = { request, onFallback };
  }, [request, onFallback]);

  const open = useCallback(async () => {
    const current = session.current;
    const mine = ++current.generation;
    stopStream(current.stream);
    current.stream = null;
    setState({ status: 'opening' });
    try {
      const stream = await openCamera(latest.current.request);
      if (mine !== current.generation) {
        stopStream(stream);
        return;
      }
      current.stream = stream;
      // The saved device is gone: forget it so the settings stop pointing at nothing.
      if (stream.usedFallback) latest.current.onFallback();
      // A track ends when the webcam is unplugged or iOS hands the camera to a phone call. The
      // preview would freeze silently, so it becomes an error the screen can explain.
      const onEnded = () => {
        if (mine !== current.generation) return;
        current.generation++;
        stopStream(stream);
        current.stream = null;
        setState({ status: 'error', kind: 'in-use' });
      };
      stream.getTracks().forEach((track) => track.addEventListener('ended', onEnded, { once: true }));
      setState({ status: 'ready', stream });
    } catch (error) {
      if (mine !== current.generation) return;
      setState({ status: 'error', kind: error instanceof CameraError ? error.kind : 'unknown' });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const current = session.current;
    const mine = ++current.generation;
    void alreadyAllowed().then((allowed) => {
      if (mine !== current.generation) return;
      if (allowed) void open();
      else setState({ status: 'explain' });
    });
    return () => {
      current.generation++;
      stopStream(current.stream);
      current.stream = null;
    };
  }, [enabled, open]);

  return { state, open };
};
