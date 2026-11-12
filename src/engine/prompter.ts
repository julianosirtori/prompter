/**
 * The prompter engine: a small state machine that drives which chunk is on screen.
 *
 *   ready → countdown → running ⇄ (holding) → tail → finished
 *
 * The take clock (`elapsed`) starts at the countdown, which is also when recording starts, so
 * block marks line up with the video file. In "timed" mode a script clock advances at `speed`
 * and decides the chunk; hold/advance/back adjust it. In "manual" mode only advance/back move.
 *
 * Framework-agnostic: React reads it through `subscribe` + `getSnapshot`.
 */
import {
  buildTimeline,
  itemIndexAt,
  type BlockMark,
  type BlockRange,
  type Timeline,
  type TimelineItem,
} from '../domain/timeline';
import type { Block } from '../domain/types';

export type AdvanceMode = 'timed' | 'manual';
export type Phase = 'ready' | 'countdown' | 'running' | 'tail' | 'finished';

export interface PrompterOptions {
  blocks: readonly Block[];
  range: BlockRange;
  mode: AdvanceMode;
  /** 0.8–1.2; only affects timed mode. */
  speed?: number;
  countdownSeconds?: number;
  /** Extra recording after the last block, a breath for the cut. */
  tailSeconds?: number;
  clock?: Clock;
}

export interface Clock {
  /** Milliseconds. */
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
}

export interface PrompterSnapshot {
  phase: Phase;
  /** Whole seconds left in the countdown (3, 2, 1). */
  countdown: number;
  current: TimelineItem | null;
  next: TimelineItem | null;
  /** 0–1 progress through the current block, for the cue bar. */
  blockProgress: number;
  /** Position of the current block within the range, 1-based, and the range size. */
  blockNumber: number;
  blockCount: number;
  holding: boolean;
  /** Seconds since recording started. */
  elapsed: number;
  /** Seconds behind (+) or ahead (−) of the script. */
  drift: number;
  /** Set when the take ends: time each block was on screen. */
  marks: BlockMark[];
  /** True when stopped before the last block finished. */
  incomplete: boolean;
}

const browserClock: Clock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

export class Prompter {
  private readonly timeline: Timeline;
  private readonly mode: AdvanceMode;
  private readonly speed: number;
  private readonly countdownSeconds: number;
  private readonly tailSeconds: number;
  private readonly clock: Clock;
  private readonly listeners = new Set<() => void>();

  private phase: Phase = 'ready';
  private startedAt = 0;
  /** Take time when the blocks started (end of countdown). */
  private blocksStartedAt = 0;
  private tailStartedAt = 0;
  /** Script clock in seconds from the range start; advanced on each frame in timed mode. */
  private scriptTime = 0;
  private lastFrameAt = 0;
  private itemIndex = 0;
  private holding = false;
  private incomplete = false;
  private frame: number | null = null;
  private readonly marks = new Map<number, BlockMark>();
  private snapshot: PrompterSnapshot;

  constructor(options: PrompterOptions) {
    this.timeline = buildTimeline(options.blocks, options.range);
    this.mode = options.mode;
    this.speed = options.speed ?? 1;
    this.countdownSeconds = options.countdownSeconds ?? 3;
    this.tailSeconds = options.tailSeconds ?? 1.5;
    this.clock = options.clock ?? browserClock;
    this.snapshot = this.computeSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PrompterSnapshot => this.snapshot;

  get duration(): number {
    return this.timeline.duration;
  }

  start(): void {
    if (this.phase !== 'ready') return;
    this.startedAt = this.clock.now();
    this.lastFrameAt = this.startedAt;
    this.phase = this.countdownSeconds > 0 ? 'countdown' : 'running';
    if (this.phase === 'running') this.enterBlocks(0);
    this.loop();
  }

  /** Next chunk. From the last chunk it ends the take. */
  advance(): void {
    if (this.phase !== 'running') return;
    this.goTo(this.itemIndex + 1);
  }

  back(): void {
    if (this.phase !== 'running') return;
    this.goTo(Math.max(0, this.itemIndex - 1));
  }

  /** Freezes the current chunk while held (timed mode). */
  setHolding(holding: boolean): void {
    if (this.holding === holding || this.mode !== 'timed') return;
    this.holding = holding;
    this.emit();
  }

  /** Stops early. Marks keep the blocks already shown. */
  stop(): void {
    if (this.phase === 'finished' || this.phase === 'ready') return;
    this.incomplete = this.phase !== 'tail';
    this.finish(this.elapsedNow());
  }

  dispose(): void {
    if (this.frame !== null) this.clock.cancelFrame(this.frame);
    this.frame = null;
    this.listeners.clear();
  }

  private loop = (): void => {
    this.tick();
    if (this.phase !== 'finished') this.frame = this.clock.requestFrame(this.loop);
  };

  private elapsedNow(): number {
    return (this.clock.now() - this.startedAt) / 1000;
  }

  private tick(): void {
    const now = this.clock.now();
    const frameSeconds = (now - this.lastFrameAt) / 1000;
    this.lastFrameAt = now;
    const elapsed = (now - this.startedAt) / 1000;

    if (this.phase === 'countdown' && elapsed >= this.countdownSeconds) {
      this.phase = 'running';
      this.enterBlocks(elapsed);
    } else if (this.phase === 'running' && this.mode === 'timed' && !this.holding) {
      this.scriptTime += frameSeconds * this.speed;
      if (this.scriptTime >= this.timeline.duration) this.enterTail(elapsed);
      else this.setItem(itemIndexAt(this.timeline, this.scriptTime), elapsed);
    } else if (this.phase === 'tail' && elapsed - this.tailStartedAt >= this.tailSeconds) {
      this.finish(elapsed);
      return;
    }
    this.emit();
  }

  private enterBlocks(elapsed: number): void {
    this.blocksStartedAt = elapsed;
    this.scriptTime = 0;
    this.itemIndex = -1;
    this.setItem(0, elapsed);
  }

  private goTo(index: number): void {
    const elapsed = this.elapsedNow();
    if (index >= this.timeline.items.length) {
      this.enterTail(elapsed);
    } else {
      this.setItem(index, elapsed);
      this.scriptTime = this.timeline.items[index]?.start ?? this.scriptTime;
    }
    this.emit();
  }

  /** Moves to an item and records block boundaries for the cut markers. */
  private setItem(index: number, elapsed: number): void {
    if (index === this.itemIndex) return;
    const previous = this.timeline.items[this.itemIndex];
    const item = this.timeline.items[index];
    this.itemIndex = index;
    if (!item || previous?.blockIndex === item.blockIndex) return;
    if (previous) this.closeMark(previous.blockIndex, elapsed);
    // Going back into a block keeps its first start; going forward opens a new mark.
    const existing = this.marks.get(item.blockIndex);
    this.marks.set(item.blockIndex, { blockIndex: item.blockIndex, start: existing?.start ?? elapsed, end: elapsed });
  }

  private closeMark(blockIndex: number, elapsed: number): void {
    const mark = this.marks.get(blockIndex);
    if (mark) mark.end = elapsed;
  }

  private enterTail(elapsed: number): void {
    const last = this.timeline.items[this.itemIndex];
    if (last) this.closeMark(last.blockIndex, elapsed);
    this.phase = 'tail';
    this.tailStartedAt = elapsed;
  }

  private finish(elapsed: number): void {
    if (this.phase === 'running') {
      const current = this.timeline.items[this.itemIndex];
      if (current) this.closeMark(current.blockIndex, elapsed);
    }
    this.phase = 'finished';
    if (this.frame !== null) this.clock.cancelFrame(this.frame);
    this.frame = null;
    this.emit(elapsed);
  }

  private emit(elapsed = this.elapsedNow()): void {
    this.snapshot = this.computeSnapshot(elapsed);
    this.listeners.forEach((listener) => listener());
  }

  private computeSnapshot(elapsed = 0): PrompterSnapshot {
    const { items } = this.timeline;
    const showing = this.phase === 'running' || this.phase === 'ready' || this.phase === 'countdown';
    const index = Math.max(0, this.itemIndex);
    const current = showing ? (items[index] ?? null) : null;
    const next = showing ? (items[index + 1] ?? null) : null;
    const blockIndex = current?.blockIndex ?? this.timeline.lastBlock;
    const blockStart = this.timeline.blockStarts.get(blockIndex) ?? 0;
    const block = items.filter((item) => item.blockIndex === blockIndex);
    const blockDuration = block.reduce((sum, item) => sum + item.duration, 0);

    let blockProgress = 0;
    if (this.phase === 'running' && blockDuration > 0) {
      const position =
        this.mode === 'timed'
          ? this.scriptTime - blockStart
          : (elapsed - (this.marks.get(blockIndex)?.start ?? elapsed)) * this.speed;
      blockProgress = Math.min(1, Math.max(0, position / blockDuration));
    } else if (this.phase === 'tail' || this.phase === 'finished') {
      blockProgress = 1;
    }

    const blocksElapsed = Math.max(0, elapsed - this.blocksStartedAt);
    const drift =
      this.phase === 'running' && this.mode === 'timed' ? blocksElapsed - this.scriptTime / this.speed : 0;

    return {
      phase: this.phase,
      countdown: this.phase === 'countdown' ? Math.ceil(this.countdownSeconds - elapsed) : 0,
      current,
      next,
      blockProgress,
      blockNumber: blockIndex - this.timeline.firstBlock + 1,
      blockCount: this.timeline.lastBlock - this.timeline.firstBlock + 1,
      holding: this.holding,
      elapsed,
      drift,
      marks: [...this.marks.values()].sort((a, b) => a.blockIndex - b.blockIndex).map((mark) => ({ ...mark })),
      incomplete: this.incomplete,
    };
  }
}
