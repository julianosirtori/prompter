import type { RefObject } from 'react';
import type { TakeVideo } from './useTakeVideo';

interface TakePlayerProps {
  video: TakeVideo;
  videoRef: RefObject<HTMLVideoElement | null>;
  prompterOnly: boolean;
  onTime(seconds: number): void;
}

/**
 * MediaRecorder files often report an infinite duration, which makes seeking fail. Seeking far
 * past the end once forces the browser to work out the real duration.
 */
const fixDuration = (video: HTMLVideoElement): void => {
  if (Number.isFinite(video.duration)) return;
  const restore = () => {
    video.removeEventListener('timeupdate', restore);
    video.currentTime = 0;
  };
  video.addEventListener('timeupdate', restore);
  video.currentTime = Number.MAX_SAFE_INTEGER;
};

export function TakePlayer({ video, videoRef, prompterOnly, onTime }: TakePlayerProps) {
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
          onLoadedMetadata={(event) => fixDuration(event.currentTarget)}
          onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)}
          onSeeked={(event) => onTime(event.currentTarget.currentTime)}
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
