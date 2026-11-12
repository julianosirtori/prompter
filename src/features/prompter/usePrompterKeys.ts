import { useEffect, useRef } from 'react';
import { isDialogOpen, isTypingTarget } from '../../ui/useHotkeys';

export interface PrompterKeyHandlers {
  /** Space (tap), Enter, →, PageDown: start when ready, otherwise next chunk. */
  onPrimary(): void;
  /** ←, PageUp. */
  onBack(): void;
  /** Space held past the threshold, and its release. */
  onHold(holding: boolean): void;
  /** Esc, S. */
  onStop(): void;
  /** F. */
  onFullscreen(): void;
  /** 1–9. */
  onJump(blockNumber: number): void;
  /** + and −. */
  onSpeed(direction: 1 | -1): void;
}

const HOLD_AFTER_MS = 400;

/**
 * Keyboard and Bluetooth page-turner control. A quick Space advances; holding it freezes the
 * chunk until released.
 */
export const usePrompterKeys = (handlers: PrompterKeyHandlers, enabled: boolean): void => {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;
    let holdTimer: number | null = null;
    let spaceDown = false;
    let holding = false;

    const clearTimer = () => {
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      holdTimer = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || isDialogOpen()) return;
      const onButton = event.target instanceof HTMLButtonElement;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (event.repeat || spaceDown) return;
          spaceDown = true;
          holdTimer = window.setTimeout(() => {
            holdTimer = null;
            holding = true;
            latest.current.onHold(true);
          }, HOLD_AFTER_MS);
          return;
        case 'Enter':
          // Enter on a focused button keeps its native meaning.
          if (onButton || event.repeat) return;
          event.preventDefault();
          latest.current.onPrimary();
          return;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          latest.current.onPrimary();
          return;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          latest.current.onBack();
          return;
        case 'Escape':
        case 's':
        case 'S':
          if (event.repeat) return;
          event.preventDefault();
          latest.current.onStop();
          return;
        case 'f':
        case 'F':
          if (!event.repeat) latest.current.onFullscreen();
          return;
        case '+':
        case '=':
          latest.current.onSpeed(1);
          return;
        case '-':
        case '_':
          latest.current.onSpeed(-1);
          return;
        default:
          if (/^[1-9]$/.test(event.key) && !event.repeat) latest.current.onJump(Number(event.key));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== ' ' || !spaceDown) return;
      spaceDown = false;
      clearTimer();
      if (holding) {
        holding = false;
        latest.current.onHold(false);
      } else {
        latest.current.onPrimary();
      }
    };

    /** Losing focus mid-hold would otherwise leave the text frozen. */
    const onBlur = () => {
      spaceDown = false;
      clearTimer();
      if (holding) {
        holding = false;
        latest.current.onHold(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      onBlur();
    };
  }, [enabled]);
};
