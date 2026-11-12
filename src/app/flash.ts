/** One-shot messages that survive a navigation ("Take 2 salvo · 30,8s"), keyed by destination. */
import { useCallback, useEffect, useState } from 'react';

const VISIBLE_MS = 7000;
const pending = new Map<string, string>();

export const setFlash = (key: string, text: string): void => {
  pending.set(key, text);
};

export const takeFlashKey = (takeId: string): string => `take:${takeId}`;
export const reviewFlashKey = (scriptId: string): string => `review:${scriptId}`;

export const useFlash = (key: string): [string | null, () => void] => {
  const [text, setText] = useState<string | null>(() => pending.get(key) ?? null);
  const dismiss = useCallback(() => setText(null), []);

  useEffect(() => {
    pending.delete(key);
  }, [key]);

  useEffect(() => {
    if (!text) return;
    const timer = window.setTimeout(dismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [text, dismiss]);

  return [text, dismiss];
};
