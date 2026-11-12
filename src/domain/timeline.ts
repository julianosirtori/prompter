/**
 * Flattens a range of blocks into the sequence of items the prompter shows, one chunk at a time,
 * with each item's start and duration on the script clock (seconds from the range start).
 */
import { chunkDurations } from './chunking';
import { blockDuration, type Block } from './types';

export interface TimelineItem {
  /** Index of the block in the script (not in the range). */
  blockIndex: number;
  chunkIndex: number;
  /** Chunk text, or the stage direction for a silent block. */
  text: string;
  /** Directions to show above this chunk (only on the first chunk of a block). */
  directions: string[];
  silent: boolean;
  start: number;
  duration: number;
}

export interface Timeline {
  items: TimelineItem[];
  /** Script-clock start of each block in the range, keyed by block index. */
  blockStarts: Map<number, number>;
  duration: number;
  firstBlock: number;
  lastBlock: number;
}

/** When a block was on screen during a take, in seconds from the recording start. */
export interface BlockMark {
  blockIndex: number;
  start: number;
  end: number;
}

export interface BlockRange {
  from: number;
  /** Inclusive. */
  to: number;
}

export const fullRange = (blocks: readonly Block[]): BlockRange => ({ from: 0, to: Math.max(0, blocks.length - 1) });

export const buildTimeline = (blocks: readonly Block[], range: BlockRange): Timeline => {
  const items: TimelineItem[] = [];
  const blockStarts = new Map<number, number>();
  let cursor = 0;

  for (let blockIndex = range.from; blockIndex <= range.to; blockIndex++) {
    const block = blocks[blockIndex];
    if (!block) continue;
    const duration = blockDuration(block);
    blockStarts.set(blockIndex, cursor);

    if (block.chunks.length === 0) {
      items.push({
        blockIndex,
        chunkIndex: 0,
        text: block.directions.join(' · ') || 'Pausa',
        directions: [],
        silent: true,
        start: cursor,
        duration,
      });
    } else {
      let offset = cursor;
      chunkDurations(block.chunks, duration).forEach((chunkDuration, chunkIndex) => {
        items.push({
          blockIndex,
          chunkIndex,
          text: block.chunks[chunkIndex] ?? '',
          directions: chunkIndex === 0 ? block.directions : [],
          silent: false,
          start: offset,
          duration: chunkDuration,
        });
        offset += chunkDuration;
      });
    }
    cursor += duration;
  }

  return { items, blockStarts, duration: cursor, firstBlock: range.from, lastBlock: range.to };
};

/** Index of the item active at script time `t` (clamped to the timeline). */
export const itemIndexAt = (timeline: Timeline, t: number): number => {
  const { items } = timeline;
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item && t >= item.start) return index;
  }
  return 0;
};

/** Last chunk of the block before the range, shown greyed as context when re-recording a block. */
export const contextBefore = (blocks: readonly Block[], range: BlockRange): string | null => {
  const previous = blocks[range.from - 1];
  if (!previous) return null;
  return previous.chunks.at(-1) ?? previous.directions.at(-1) ?? null;
};
