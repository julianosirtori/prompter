import { useEffect } from 'react';
import type { Prompter } from '../../engine/prompter';
import { usePrompterValue } from './usePrompterValue';

/**
 * In manual mode the engine waits for a tap on every chunk, but a silent block ("sorri, sem
 * falar") must move on by itself when its scripted time is over.
 */
export const useSilentAutoAdvance = (prompter: Prompter, manual: boolean): void => {
  const silentBlock = usePrompterValue(prompter, ({ phase, current }) =>
    manual && phase === 'running' && current?.silent ? current.blockIndex : null,
  );
  const seconds = usePrompterValue(prompter, ({ current }) => current?.duration ?? 0);

  useEffect(() => {
    if (silentBlock === null) return;
    const timer = window.setTimeout(() => prompter.advance(), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [prompter, silentBlock, seconds]);
};
