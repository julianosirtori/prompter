import { useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream;
}

/**
 * Live preview. Mirrored like a selfie camera unless it is the rear camera; the recording itself
 * is never mirrored. On wide screens CSS frames it as the 9:16 slice that gets recorded.
 */
export function CameraPreview({ stream }: CameraPreviewProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const mirrored = stream.getVideoTracks()[0]?.getSettings().facingMode !== 'environment';

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="stage__camera" aria-hidden="true">
      <video ref={ref} className={mirrored ? 'is-mirrored' : undefined} autoPlay muted playsInline />
    </div>
  );
}
