import { useEffect, useMemo } from 'react';
import type { Block } from '../../domain/types';
import { Prompter, type AdvanceMode } from '../../engine/prompter';

export interface PrompterConfig {
  blocks: readonly Block[];
  from: number;
  to: number;
  mode: AdvanceMode;
  speed: number;
  countdownSeconds: number;
  tailSeconds: number;
  /** Bumping this builds a fresh engine ("De novo", "Ensaiar de novo"). */
  attempt: number;
}

/** One engine per configuration, disposed when replaced or when the screen goes away. */
export const usePrompter = (config: PrompterConfig): Prompter => {
  const { blocks, from, to, mode, speed, countdownSeconds, tailSeconds, attempt } = config;
  const prompter = useMemo(
    () => {
      void attempt;
      return new Prompter({ blocks, range: { from, to }, mode, speed, countdownSeconds, tailSeconds });
    },
    [blocks, from, to, mode, speed, countdownSeconds, tailSeconds, attempt],
  );
  useEffect(() => () => prompter.dispose(), [prompter]);
  return prompter;
};
