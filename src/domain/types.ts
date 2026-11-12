/** Domain model for a timed video script. All times are in seconds. */

export interface Block {
  id: string;
  /** Start of the block in the script timeline. */
  start: number;
  /** End of the block in the script timeline. Always greater than `start`. */
  end: number;
  /** What the speaker says, with stage directions removed. Empty for silent blocks. */
  speech: string;
  /** Stage directions found in the speech column, e.g. "sorri, sem falar". */
  directions: string[];
  /** Editing notes ("O que eu ponho na edição"). Never shown while recording. */
  edit: string;
  /** Columns the parser could not classify, kept so nothing is lost. */
  extra: string[];
  /** Speech split into short chunks (2–6 words) shown one at a time. */
  chunks: string[];
}

export interface Script {
  id: string;
  title: string;
  /** ASCII, lowercase, used in file names. */
  slug: string;
  /** Original pasted text, kept so a script can be re-parsed. */
  source: string;
  blocks: Block[];
  /** True when at least one block duration was estimated from word count. */
  timesEstimated: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ScriptWarning =
  | { kind: 'gap'; afterBlock: number; seconds: number }
  | { kind: 'overlap'; afterBlock: number; seconds: number }
  | { kind: 'tight'; block: number; words: number; seconds: number }
  | { kind: 'estimated' };

export type ParseResult =
  | { ok: true; script: Script; warnings: ScriptWarning[] }
  | { ok: false; error: 'empty' | 'unrecognized' };

export const blockDuration = (block: Pick<Block, 'start' | 'end'>): number =>
  block.end - block.start;

export const isSilent = (block: Pick<Block, 'speech'>): boolean =>
  block.speech.trim().length === 0;
