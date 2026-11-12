/**
 * Splits spoken text into short chunks (2–6 words) so the eye never scans a long line,
 * and weights each chunk by syllables and pauses so time-based advance follows speech rhythm.
 */
import { fold, words } from './text';

const MAX_WORDS = 6;
const MIN_WORDS = 2;

/** Words that usually start a new phrase; a chunk may break before them. */
const STRONG_BREAK_BEFORE = new Set(['que', 'e', 'mas', 'ou', 'porque', 'quando', 'se', 'pra', 'para']);
const WEAK_BREAK_BEFORE = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'com', 'sem', 'em', 'por', 'pelo', 'pela']);

const endsPhrase = (word: string): boolean => /[,.;:!?…]["')\]]*$/.test(word);

export const splitIntoChunks = (speech: string): string[] => {
  const tokens = words(speech);
  const chunks: string[][] = [];
  let current: string[] = [];

  tokens.forEach((word, index) => {
    current.push(word);
    const next = tokens[index + 1];
    const nextFolded = next ? fold(next) : '';
    const size = current.length;
    const shouldBreak =
      next === undefined ||
      size >= MAX_WORDS ||
      (endsPhrase(word) && size >= MIN_WORDS) ||
      (STRONG_BREAK_BEFORE.has(nextFolded) && size >= MIN_WORDS) ||
      (WEAK_BREAK_BEFORE.has(nextFolded) && size >= 3);
    if (shouldBreak) {
      chunks.push(current);
      current = [];
    }
  });

  // Avoid a lonely last word: merge it into the previous chunk when that stays short.
  const last = chunks.at(-1);
  const previous = chunks.at(-2);
  if (last && previous && last.length === 1 && previous.length < MAX_WORDS) {
    previous.push(...last);
    chunks.pop();
  }

  return chunks.map((chunk) => chunk.join(' '));
};

const syllables = (word: string): number => {
  const groups = fold(word).match(/[aeiouy]+/g);
  // Digits are read aloud as words; count each as roughly two syllables.
  const digits = word.match(/\d/g)?.length ?? 0;
  return Math.max(1, (groups?.length ?? 0) + digits * 2);
};

/** Pause after a chunk, measured in syllable-equivalents. */
const pauseWeight = (chunk: string): number => {
  if (/[.!?…]["')\]]*$/.test(chunk)) return 2.5;
  if (/[,;:]["')\]]*$/.test(chunk)) return 1.5;
  return 0.5;
};

/** Relative speaking weight of a chunk. */
export const chunkWeight = (chunk: string): number =>
  words(chunk).reduce((total, word) => total + syllables(word), 0) + pauseWeight(chunk);

/** Duration of each chunk when a block of `duration` seconds is spoken at an even rhythm. */
export const chunkDurations = (chunks: readonly string[], duration: number): number[] => {
  if (chunks.length === 0) return [];
  const weights = chunks.map(chunkWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (duration * weight) / total);
};
