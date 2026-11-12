/** Non-blocking warnings shown on the review screen. */
import { TIGHT_WORDS_PER_SECOND } from './pace';
import { countWords } from './text';
import { blockDuration, type Script, type ScriptWarning } from './types';

/** Differences under this are rounding noise, not real gaps. */
const TOLERANCE = 0.05;

export const validateScript = (script: Script): ScriptWarning[] => {
  const warnings: ScriptWarning[] = [];
  if (script.timesEstimated) warnings.push({ kind: 'estimated' });

  script.blocks.forEach((block, index) => {
    const previous = script.blocks[index - 1];
    if (previous) {
      const difference = block.start - previous.end;
      if (difference > TOLERANCE) warnings.push({ kind: 'gap', afterBlock: index - 1, seconds: difference });
      if (difference < -TOLERANCE) warnings.push({ kind: 'overlap', afterBlock: index - 1, seconds: -difference });
    }
    const seconds = blockDuration(block);
    const count = countWords(block.speech);
    if (seconds > 0 && count / seconds > TIGHT_WORDS_PER_SECOND) {
      warnings.push({ kind: 'tight', block: index, words: count, seconds });
    }
  });
  return warnings;
};
