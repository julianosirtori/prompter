import { useEffect } from 'react';
import type { Prompter, PrompterSnapshot } from '../../engine/prompter';

/**
 * In manual mode the engine waits for a tap on every chunk, but a silent block ("sorri, sem
 * falar") must move on by itself when its scripted time is over.
 */
export const useSilentAutoAdvance = (prompter: Prompter, snapshot: PrompterSnapshot, manual: boolean): void => {
  const { phase, current } = snapshot;
  const silentBlock = manual && phase === 'running' && current?.silent ? current.blockIndex : null;
  const seconds = current?.duration ?? 0;

  useEffect(() => {
    if (silentBlock === null) return;
    const timer = window.setTimeout(() => prompter.advance(), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [prompter, silentBlock, seconds]);
};
