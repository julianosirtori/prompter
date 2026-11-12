import { useEffect, useState } from 'react';
import type { Take } from '../../domain/take';
import { getVideo } from '../../storage/takes';

export type TakeVideo =
  | { status: 'loading' }
  | { status: 'ready'; url: string; blob: Blob }
  /** Prompter-only take, or the browser cleared the stored video. */
  | { status: 'missing' };

interface Loaded {
  takeId: string;
  video: TakeVideo;
}

/**
 * Loads the take's video when the screen opens (not inside the "Baixar" click: on Safari an
 * await before `navigator.share` loses the user gesture) and revokes the object URL afterwards.
 */
export const useTakeVideo = (take: Take): TakeVideo => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const hasVideo = take.kind === 'camera';

  useEffect(() => {
    if (!hasVideo) return;
    let cancelled = false;
    let url: string | null = null;
    getVideo(take.id)
      .catch(() => undefined)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setLoaded({ takeId: take.id, video: { status: 'missing' } });
          return;
        }
        url = URL.createObjectURL(blob);
        setLoaded({ takeId: take.id, video: { status: 'ready', url, blob } });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [take.id, hasVideo]);

  if (!hasVideo) return { status: 'missing' };
  return loaded?.takeId === take.id ? loaded.video : { status: 'loading' };
};
