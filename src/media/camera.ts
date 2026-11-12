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

const errorKind = (error: unknown): CameraErrorKind => {
  if (!(error instanceof DOMException)) return 'unknown';
  switch (error.name) {
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

export const openCamera = async (request: CameraRequest): Promise<MediaStream> => {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported');
  const video: MediaTrackConstraints = request.videoDeviceId
    ? { deviceId: { exact: request.videoDeviceId } }
    : { facingMode: request.facing };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { ...video, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: {
        ...(request.audioDeviceId ? { deviceId: { exact: request.audioDeviceId } } : {}),
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (error) {
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
