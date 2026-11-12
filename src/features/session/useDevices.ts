import { useEffect, useState } from 'react';
import { listDevices } from '../../media/camera';

interface Devices {
  video: MediaDeviceInfo[];
  audio: MediaDeviceInfo[];
}

const NONE: Devices = { video: [], audio: [] };

/** Cameras and microphones; labels only show up after permission was granted once. */
export const useDevices = (enabled: boolean): Devices => {
  const [devices, setDevices] = useState<Devices>(NONE);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listDevices()
      .catch(() => NONE)
      .then((found) => {
        if (!cancelled) setDevices(found);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return enabled ? devices : NONE;
};
