import { useRef, type RefObject, type SyntheticEvent } from 'react';
import type { TakeVideo } from './useTakeVideo';

interface TakePlayerProps {
  video: TakeVideo;
  videoRef: RefObject<HTMLVideoElement | null>;
  prompterOnly: boolean;
  onTime(seconds: number): void;
}

type VideoEvent = SyntheticEvent<HTMLVideoElement>;

const FIX_TIMEOUT_MS = 2000;

export function TakePlayer({ video, videoRef, prompterOnly, onTime }: TakePlayerProps) {
  /**
   * MediaRecorder files often report an infinite duration, which makes seeking fail. Seeking far
   * past the end once makes the browser work out the real duration. While that correction runs
   * its fake position is not reported, and it never undoes a seek the user made meanwhile.
   */
  const fixing = useRef(false);

  const startFix = (event: VideoEvent) => {
    const player = event.currentTarget;
    if (Number.isFinite(player.duration)) return;
    fixing.current = true;
    player.currentTime = Number.MAX_SAFE_INTEGER;
    // A broken file may never get a finite duration; stop hiding the position after a moment.
    window.setTimeout(() => {
      fixing.current = false;
    }, FIX_TIMEOUT_MS);
  };

  const abortFix = () => {
    fixing.current = false;
  };

  const endFix = (event: VideoEvent) => {
    const player = event.currentTarget;
    if (!fixing.current || !Number.isFinite(player.duration)) return;
    fixing.current = false;
    // Still parked at the end by the correction: back to the start. Anywhere else was the user.
    if (player.currentTime >= player.duration - 0.25) player.currentTime = 0;
  };

  const report = (event: VideoEvent) => {
    endFix(event);
    if (!fixing.current) onTime(event.currentTarget.currentTime);
  };

  return (
    <div className={`player${video.status === 'missing' ? ' player--note' : ''}`}>
      {video.status === 'ready' ? (
        <video
          ref={videoRef}
          src={video.url}
          controls
          playsInline
          preload="metadata"
          aria-label="Vídeo do take"
          onLoadedMetadata={startFix}
          onDurationChange={endFix}
          onTimeUpdate={report}
          onSeeked={report}
          onError={abortFix}
        />
      ) : (
        <p className="player__empty">
          {video.status === 'loading' && 'Abrindo o vídeo…'}
          {video.status === 'missing' &&
            (prompterOnly
              ? 'Take de prompter: o vídeo está na câmera que você usou para gravar.'
              : 'O vídeo deste take não está mais guardado neste aparelho.')}
        </p>
      )}
    </div>
  );
}
