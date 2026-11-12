import { useEffect, useRef } from 'react';

export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export const isDialogOpen = (): boolean => document.querySelector('dialog[open]') !== null;

/** Single-key shortcuts (lowercase keys). Ignored while typing, with modifiers or under a dialog. */
export const useHotkeys = (keys: Readonly<Record<string, () => void>>, enabled = true): void => {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  }, [keys]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target) || isDialogOpen()) return;
      const handler = latest.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
};
