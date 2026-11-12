/** Takes: what was recorded, which blocks it covers and how its pace compared to the script. */
import type { BlockMark, BlockRange } from './timeline';
import { blockDuration, type Block, type Script } from './types';

export type TakeKind = 'camera' | 'prompter';

export interface Take {
  id: string;
  scriptId: string;
  /** 1-based, per script. */
  number: number;
  kind: TakeKind;
  range: BlockRange;
  /** Whether the range covers the whole script. */
  complete: boolean;
  /** Stopped before the end of its range. */
  incomplete: boolean;
  marks: BlockMark[];
  duration: number;
  /** Only for camera takes; the video itself lives in a separate store. */
  mimeType?: string;
  sizeBytes?: number;
  starred: boolean;
  /** "Pareceu conversa ou leitura?" 1 (leitura) to 5 (conversa). */
  selfRating?: number;
  createdAt: number;
}

export const rangeLabel = (range: BlockRange, complete: boolean): string => {
  if (complete) return 'completo';
  const from = range.from + 1;
  const to = range.to + 1;
  return from === to ? `bloco ${from}` : `blocos ${from}–${to}`;
};

/** `fisiorotina_completo_t1.mp4`, `fisiorotina_b04_t2.mp4`, `fisiorotina_b04-05_t3.mp4`. */
export const takeFileName = (script: Pick<Script, 'slug'>, take: Take, extension: string): string => {
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const blocks = take.complete
    ? 'completo'
    : take.range.from === take.range.to
      ? `b${pad(take.range.from)}`
      : `b${pad(take.range.from)}-${pad(take.range.to)}`;
  return `${script.slug}_${blocks}_t${take.number}.${extension}`;
};

export interface BlockPace {
  blockIndex: number;
  scripted: number;
  actual: number;
  /** actual − scripted; positive means slower than the script. */
  difference: number;
  /** Beyond ±0.5s the review highlights the block. */
  offPace: boolean;
}

const OFF_PACE_SECONDS = 0.5;

export const blockPaces = (blocks: readonly Block[], marks: readonly BlockMark[]): BlockPace[] =>
  marks.flatMap((mark) => {
    const block = blocks[mark.blockIndex];
    if (!block) return [];
    const scripted = blockDuration(block);
    const actual = mark.end - mark.start;
    const difference = actual - scripted;
    return [{ blockIndex: mark.blockIndex, scripted, actual, difference, offPace: Math.abs(difference) > OFF_PACE_SECONDS }];
  });

export const nextTakeNumber = (takes: readonly Pick<Take, 'number'>[]): number =>
  takes.reduce((max, take) => Math.max(max, take.number), 0) + 1;
