/**
 * Records a take with MediaRecorder. Landscape sources (desktop webcams) are cropped to a
 * centered 9:16 frame through a canvas, so every take comes out ready for Reels/TikTok.
 *
 * The container is chosen by feature detection, never by browser version: MP4 first (the only
 * option on older iOS and the friendliest for editors), WebM as a fallback.
 */

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

const PORTRAIT_RATIO = 9 / 16;
const OUTPUT_HEIGHT = 1280;
const FRAME_RATE = 30;

export const isRecordingSupported = (): boolean => typeof MediaRecorder !== 'undefined';

export const pickMimeType = (): string | undefined =>
  MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));

export const extensionFor = (mimeType: string): 'mp4' | 'webm' => (mimeType.includes('mp4') ? 'mp4' : 'webm');

export interface RecordedTake {
  blob: Blob;
  mimeType: string;
}

/**
 * Draws the center 9:16 slice of a landscape video track onto a canvas and returns the canvas
 * stream plus a cleanup function. The original audio tracks are added untouched.
 */
const cropToPortrait = (source: MediaStream): { stream: MediaStream; dispose: () => void } => {
  const video = document.createElement('video');
  video.srcObject = source;
  video.muted = true;
  video.playsInline = true;
  void video.play();

  const canvas = document.createElement('canvas');
  canvas.height = OUTPUT_HEIGHT;
  canvas.width = Math.round(OUTPUT_HEIGHT * PORTRAIT_RATIO);
  const context = canvas.getContext('2d');

  let frame = 0;
  const draw = () => {
    if (context && video.videoWidth > 0) {
      const sourceWidth = video.videoHeight * PORTRAIT_RATIO;
      const sourceX = (video.videoWidth - sourceWidth) / 2;
      // Not mirrored: like the phone camera path, the file shows the true view; only the preview mirrors.
      context.drawImage(video, sourceX, 0, sourceWidth, video.videoHeight, 0, 0, canvas.width, canvas.height);
    }
    frame = requestAnimationFrame(draw);
  };
  draw();

  const stream = canvas.captureStream(FRAME_RATE);
  source.getAudioTracks().forEach((track) => stream.addTrack(track));
  return {
    stream,
    dispose: () => {
      cancelAnimationFrame(frame);
      stream.getVideoTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
};

const isLandscape = (stream: MediaStream): boolean => {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  return Boolean(settings?.width && settings.height && settings.width > settings.height);
};

export class TakeRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private disposeCrop: (() => void) | null = null;
  private stopped: Promise<RecordedTake> | null = null;
  private readonly source: MediaStream;

  constructor(source: MediaStream) {
    this.source = source;
  }

  start(): void {
    const mimeType = pickMimeType();
    let stream = this.source;
    if (isLandscape(this.source)) {
      const crop = cropToPortrait(this.source);
      stream = crop.stream;
      this.disposeCrop = crop.dispose;
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'video/mp4';
        resolve({ blob: new Blob(this.chunks, { type }), mimeType: type });
      };
      recorder.onerror = (event) => reject(event instanceof ErrorEvent ? event.error : new Error('recording failed'));
    });
    // A timeslice keeps data flowing, so a crash loses at most one second.
    recorder.start(1000);
    this.recorder = recorder;
  }

  async stop(): Promise<RecordedTake> {
    if (!this.recorder || !this.stopped) throw new Error('recorder was not started');
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    try {
      return await this.stopped;
    } finally {
      this.disposeCrop?.();
      this.disposeCrop = null;
      this.recorder = null;
    }
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}
