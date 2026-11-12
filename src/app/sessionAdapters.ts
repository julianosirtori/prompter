/**
 * Glue the UI needs on top of src/domain and src/engine, kept here because those layers are
 * owned elsewhere. Each function notes what would make it unnecessary.
 */
import { newId } from '../domain/ids';
import { nextTakeNumber, type BlockPace, type Take, type TakeKind } from '../domain/take';
import type { BlockMark, BlockRange } from '../domain/timeline';
import { blockDuration, type Block, type Script } from '../domain/types';
import type { PrompterSnapshot } from '../engine/prompter';
import type { RecordedTake } from '../media/recorder';

export const isFullRange = (blocks: readonly Block[], range: BlockRange): boolean =>
  range.from === 0 && range.to >= blocks.length - 1;

/** Keeps a range from the URL inside the script. */
export const clampRange = (blocks: readonly Block[], range: BlockRange | null): BlockRange => {
  const last = Math.max(0, blocks.length - 1);
  if (!range) return { from: 0, to: last };
  const from = Math.min(range.from, last);
  return { from, to: Math.min(Math.max(range.to, from), last) };
};

/** Missing in domain/take.ts: a factory that turns a finished session into a Take. */
export const createTake = (input: {
  script: Script;
  existing: readonly Take[];
  kind: TakeKind;
  range: BlockRange;
  snapshot: PrompterSnapshot;
  recorded: RecordedTake | null;
}): Take => ({
  id: newId(),
  scriptId: input.script.id,
  number: nextTakeNumber(input.existing),
  kind: input.kind,
  range: input.range,
  complete: isFullRange(input.script.blocks, input.range),
  incomplete: input.snapshot.incomplete,
  marks: input.snapshot.marks,
  duration: input.snapshot.elapsed,
  ...(input.recorded ? { mimeType: input.recorded.mimeType, sizeBytes: input.recorded.blob.size } : {}),
  starred: false,
  createdAt: Date.now(),
});

/** A mark shorter than this is a block passed through (skipped), not one that was spoken. */
const MIN_SPOKEN_SECONDS = 0.2;

export const spokenMarks = (marks: readonly BlockMark[]): BlockMark[] =>
  marks.filter((mark) => mark.end - mark.start >= MIN_SPOKEN_SECONDS);

export const sameRange = (a: BlockRange, b: BlockRange): boolean => a.from === b.from && a.to === b.to;

/** Durations for "Usar meus tempos": measured where there is a mark, scripted elsewhere. */
export const measuredDurations = (blocks: readonly Block[], paces: readonly BlockPace[]): number[] =>
  blocks.map((block, index) => {
    const pace = paces.find((candidate) => candidate.blockIndex === index);
    return pace ? Math.max(0.5, Math.round(pace.actual * 10) / 10) : blockDuration(block);
  });

/** The mark on screen at `time` seconds into the take's video. */
export const markAt = (marks: readonly BlockMark[], time: number): BlockMark | null => {
  let found: BlockMark | null = marks[0] ?? null;
  for (const mark of marks) if (time >= mark.start) found = mark;
  return found;
};
