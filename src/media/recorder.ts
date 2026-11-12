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
  /** The recorder errored; `blob` holds whatever was captured before the failure. */
  failed: boolean;
}

/** Bitrates for a sharp 1080×1920 talking head; browser defaults (~2.5 Mbps) look like a webcam call. */
const VIDEO_BITS_PER_SECOND = 8_000_000;
const AUDIO_BITS_PER_SECOND = 128_000;

interface Crop {
  stream: MediaStream;
  dispose: () => void;
}

/**
 * Draws the center 9:16 slice of a landscape video track onto a canvas and returns the canvas
 * stream plus a cleanup function. The original audio tracks are added untouched. Resolves once
 * the first frame is painted, so the recording never starts on black frames.
 */
const cropToPortrait = async (source: MediaStream): Promise<Crop> => {
  const video = document.createElement('video');
  video.srcObject = source;
  video.muted = true;
  video.playsInline = true;

  const canvas = document.createElement('canvas');
  canvas.height = OUTPUT_HEIGHT;
  canvas.width = Math.round(OUTPUT_HEIGHT * PORTRAIT_RATIO);
  const context = canvas.getContext('2d');

  let frame = 0;
  const stream = canvas.captureStream(FRAME_RATE);
  const dispose = () => {
    cancelAnimationFrame(frame);
    stream.getVideoTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };

  try {
    await video.play();
  } catch (error) {
    dispose();
    throw error;
  }

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

  source.getAudioTracks().forEach((track) => stream.addTrack(track));
  return { stream, dispose };
};

const isLandscape = (stream: MediaStream): boolean => {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  return Boolean(settings?.width && settings.height && settings.width > settings.height);
};

/**
 * One take. Usage: `await recorder.start()` (resolves when the recorder is really recording),
 * then start the prompter, then `await recorder.stop()`.
 */
export class TakeRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private crop: Crop | null = null;
  private stopped: Promise<RecordedTake> | null = null;
  private readonly source: MediaStream;

  constructor(source: MediaStream) {
    this.source = source;
  }

  async start(): Promise<void> {
    if (this.recorder) throw new Error('recorder already started');
    const mimeType = pickMimeType();
    try {
      this.crop = isLandscape(this.source) ? await cropToPortrait(this.source) : null;
      const recorder = new MediaRecorder(this.crop?.stream ?? this.source, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
      this.chunks = [];
      let failed = false;
      this.stopped = new Promise((resolve) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) this.chunks.push(event.data);
        };
        // An error stops the recorder; `onstop` then resolves with the partial take.
        recorder.onerror = () => {
          failed = true;
        };
        recorder.onstop = () => {
          const type = recorder.mimeType || mimeType || 'video/mp4';
          resolve({ blob: new Blob(this.chunks, { type }), mimeType: type, failed });
        };
      });
      const started = new Promise<void>((resolve) => {
        recorder.onstart = () => resolve();
      });
      // The timeslice hands data over every second instead of only at the end. Chunks stay in
      // memory, so a crash of the page still loses the take.
      recorder.start(1000);
      this.recorder = recorder;
      await started;
    } catch (error) {
      this.release();
      throw error;
    }
  }

  async stop(): Promise<RecordedTake> {
    if (!this.recorder || !this.stopped) throw new Error('recorder was not started');
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    try {
      return await this.stopped;
    } finally {
      this.release();
    }
  }

  /** Frees the crop pipeline without saving anything (e.g. leaving the screen mid-take). */
  discard(): void {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.release();
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  private release(): void {
    this.crop?.dispose();
    this.crop = null;
    this.recorder = null;
  }
}
