/** Speaking pace rules shared by parsing, review and rehearsal feedback. */
import { blockDuration, type Block } from './types';
import { countWords } from './text';

/** Natural PT-BR speech, ~155 words per minute. */
export const NATURAL_WORDS_PER_SECOND = 2.6;
export const MIN_BLOCK_SECONDS = 1.5;
export const SILENT_BLOCK_SECONDS = 2;
/** Above this a block is flagged as "Apertado". */
export const TIGHT_WORDS_PER_SECOND = 3.5;

export type PaceLabel = 'calmo' | 'natural' | 'rapido';

export const estimateDuration = (speech: string): number => {
  const count = countWords(speech);
  if (count === 0) return SILENT_BLOCK_SECONDS;
  return Math.max(MIN_BLOCK_SECONDS, Math.round((count / NATURAL_WORDS_PER_SECOND) * 10) / 10);
};

export const wordsPerSecond = (speech: string, seconds: number): number =>
  seconds > 0 ? countWords(speech) / seconds : 0;

export const paceLabel = (rate: number): PaceLabel => {
  if (rate < 2.2) return 'calmo';
  if (rate <= 3.2) return 'natural';
  return 'rapido';
};

export const isTight = (block: Block): boolean =>
  wordsPerSecond(block.speech, blockDuration(block)) > TIGHT_WORDS_PER_SECOND;

/** Average pace over spoken blocks only; silent blocks would drag the number down. */
export const averagePace = (blocks: readonly Block[]): number => {
  const spoken = blocks.filter((block) => countWords(block.speech) > 0);
  const totalWords = spoken.reduce((sum, block) => sum + countWords(block.speech), 0);
  const totalSeconds = spoken.reduce((sum, block) => sum + blockDuration(block), 0);
  return totalSeconds > 0 ? totalWords / totalSeconds : 0;
};
