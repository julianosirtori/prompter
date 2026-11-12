import { useEffect, useMemo, useRef, type PointerEvent } from 'react';

export interface GestureHandlers {
  /** Short touch. */
  onTap(): void;
  /** Long touch started (true) and released (false). */
  onHold(holding: boolean): void;
  /** Swipe to the right. */
  onSwipeBack(): void;
}

const HOLD_AFTER_MS = 400;
const MOVE_TOLERANCE_PX = 12;
const SWIPE_PX = 56;

const isControl = (target: EventTarget): boolean =>
  target instanceof Element && target.closest('button, a, input, select, [data-no-gesture]') !== null;

interface Touch {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
  holding: boolean;
}

/** Touch control of the stage: tap = next chunk, long press = hold, swipe right = back. */
export const useGestures = (handlers: GestureHandlers) => {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  }, [handlers]);

  const touch = useRef<Touch | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(() => {
    const clearTimer = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };

    const finish = (event: PointerEvent, cancelled: boolean) => {
      const current = touch.current;
      if (!current || current.pointerId !== event.pointerId) return;
      touch.current = null;
      clearTimer();
      if (current.holding) {
        latest.current.onHold(false);
        return;
      }
      if (cancelled) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (dx > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) latest.current.onSwipeBack();
      else if (!current.moved) latest.current.onTap();
    };

    return {
      onPointerDown: (event: PointerEvent) => {
        if (touch.current || event.button !== 0 || isControl(event.target)) return;
        touch.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, holding: false };
        clearTimer();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          if (!touch.current || touch.current.moved) return;
          touch.current.holding = true;
          latest.current.onHold(true);
        }, HOLD_AFTER_MS);
      },
      onPointerMove: (event: PointerEvent) => {
        const current = touch.current;
        if (!current || current.pointerId !== event.pointerId || current.moved) return;
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > MOVE_TOLERANCE_PX) {
          current.moved = true;
          if (!current.holding) clearTimer();
        }
      },
      onPointerUp: (event: PointerEvent) => finish(event, false),
      onPointerCancel: (event: PointerEvent) => finish(event, true),
    };
  }, []);
};
