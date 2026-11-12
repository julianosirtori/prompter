import { useCallback, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from '../storage/local';

export type UpdateSettings = (patch: Partial<Settings>) => void;

/** Session settings, remembered between sessions. */
export const useSettings = (): [Settings, UpdateSettings] => {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const update = useCallback<UpdateSettings>((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);
  return [settings, update];
};
