/** Camera and microphone access, with errors mapped to the cases the UI explains. */

export type Facing = 'user' | 'environment';

export interface CameraRequest {
  facing: Facing;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export type CameraErrorKind = 'denied' | 'in-use' | 'not-found' | 'unsupported' | 'unknown';

export class CameraError extends Error {
  readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, cause?: unknown) {
    super(`camera: ${kind}`, { cause });
    this.name = 'CameraError';
    this.kind = kind;
  }
}

// Check `name`, not `instanceof DOMException`: some engines throw other error classes.
const errorName = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';

const errorKind = (error: unknown): CameraErrorKind => {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotReadableError':
    case 'AbortError':
      return 'in-use';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    default:
      return 'unknown';
  }
};

const isPhone = (): boolean => matchMedia('(pointer: coarse)').matches;

const constraintsFor = (request: CameraRequest): MediaStreamConstraints => {
  const source: MediaTrackConstraints = request.videoDeviceId
    ? { deviceId: { exact: request.videoDeviceId } }
    : { facingMode: request.facing };
  // Phones are held upright: ask for portrait. Webcams are landscape and get cropped to 9:16.
  const size = isPhone() ? { width: { ideal: 1080 }, height: { ideal: 1920 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } };
  return {
    video: { ...source, ...size, frameRate: { ideal: 30 } },
    audio: {
      ...(request.audioDeviceId ? { deviceId: { exact: request.audioDeviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
    },
  };
};

/**
 * Opens camera and microphone. A saved device that no longer exists (webcam unplugged, ids
 * reset by the browser) falls back to the default devices; `usedFallback` tells the caller to
 * forget the saved ids.
 */
export const openCamera = async (request: CameraRequest): Promise<MediaStream & { usedFallback?: boolean }> => {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported');
  try {
    return await navigator.mediaDevices.getUserMedia(constraintsFor(request));
  } catch (error) {
    const hadSavedDevice = Boolean(request.videoDeviceId || request.audioDeviceId);
    if (hadSavedDevice && ['OverconstrainedError', 'NotFoundError'].includes(errorName(error))) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraintsFor({ facing: request.facing }));
        return Object.assign(stream, { usedFallback: true });
      } catch (retryError) {
        throw new CameraError(errorKind(retryError), retryError);
      }
    }
    throw new CameraError(errorKind(error), error);
  }
};

export const stopStream = (stream: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop());
};

/** Device labels are only available after permission was granted once. */
export const listDevices = async (): Promise<{ video: MediaDeviceInfo[]; audio: MediaDeviceInfo[] }> => {
  const devices = (await navigator.mediaDevices?.enumerateDevices?.()) ?? [];
  return {
    video: devices.filter((device) => device.kind === 'videoinput'),
    audio: devices.filter((device) => device.kind === 'audioinput'),
  };
};
