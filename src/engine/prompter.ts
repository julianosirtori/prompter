/**
 * The prompter engine: a small state machine that drives which chunk is on screen.
 *
 *   ready → countdown → running ⇄ (holding) → tail → finished
 *
 * The take clock (`elapsed`) starts at the countdown. Start the prompter only once the recorder
 * reports it is really recording (`await recorder.start()`), so block marks line up with the
 * video file. In "timed" mode a script clock advances at `speed` and decides the chunk;
 * hold/advance/back adjust it. In "manual" mode only advance/back move.
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
  /** Seconds since recording started; frozen once finished. */
  elapsed: number;
  /** Seconds behind (+) or ahead (−) of the script. */
  drift: number;
  /** Last pass of each block shown so far, ordered by block. */
  marks: BlockMark[];
  /** True when stopped before the last block finished. */
  incomplete: boolean;
}

/**
 * A frame longer than this (tab hidden, screen off) advances the script clock by this much only,
 * so the text never jumps over whole blocks.
 */
const MAX_FRAME_SECONDS = 0.25;

const browserClock: Clock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

export class Prompter {
  private readonly timeline: Timeline;
  private readonly blockDurations = new Map<number, number>();
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
  private finishedElapsed: number | null = null;
  /** Script clock in seconds from the range start; advanced on each frame in timed mode. */
  private scriptTime = 0;
  private lastFrameAt = 0;
  private itemIndex = -1;
  private holding = false;
  private incomplete = false;
  private frame: number | null = null;
  /**
   * Latest pass through each block. Going back and forward again replaces a block's pass, so
   * marks never overlap and the exported cut is the take the speaker finished with.
   */
  private readonly passes = new Map<number, BlockMark>();
  private marksCache: BlockMark[] = [];
  private snapshot: PrompterSnapshot;

  constructor(options: PrompterOptions) {
    this.timeline = buildTimeline(options.blocks, options.range);
    for (const item of this.timeline.items) {
      this.blockDurations.set(item.blockIndex, (this.blockDurations.get(item.blockIndex) ?? 0) + item.duration);
    }
    this.mode = options.mode;
    this.speed = options.speed ?? 1;
    this.countdownSeconds = options.countdownSeconds ?? 3;
    this.tailSeconds = options.tailSeconds ?? 1.5;
    this.clock = options.clock ?? browserClock;
    this.snapshot = this.computeSnapshot(0);
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

  /** Freezes the current chunk while held (timed mode, while running). */
  setHolding(holding: boolean): void {
    if (this.holding === holding || this.mode !== 'timed') return;
    if (holding && this.phase !== 'running') return;
    this.holding = holding;
    if (this.phase !== 'finished') this.emit();
  }

  /** Stops early. Marks keep the blocks already shown; the current one is flagged interrupted. */
  stop(): void {
    if (this.phase === 'finished' || this.phase === 'ready') return;
    const elapsed = this.elapsedNow();
    if (this.phase !== 'tail') {
      this.incomplete = true;
      const current = this.timeline.items[this.itemIndex];
      const pass = current ? this.passes.get(current.blockIndex) : undefined;
      if (pass && this.phase === 'running') {
        pass.end = elapsed;
        pass.interrupted = true;
      }
    }
    this.finish(elapsed);
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
    return this.finishedElapsed ?? (this.clock.now() - this.startedAt) / 1000;
  }

  private tick(): void {
    const now = this.clock.now();
    const frameSeconds = Math.min(MAX_FRAME_SECONDS, (now - this.lastFrameAt) / 1000);
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
    this.emit(elapsed);
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
    this.emit(elapsed);
  }

  /** Moves to an item; entering a different block closes the previous pass and opens a new one. */
  private setItem(index: number, elapsed: number): void {
    if (index === this.itemIndex) return;
    const previous = this.timeline.items[this.itemIndex];
    const item = this.timeline.items[index];
    this.itemIndex = index;
    if (!item || previous?.blockIndex === item.blockIndex) return;
    if (previous) this.closePass(previous.blockIndex, elapsed);
    this.passes.set(item.blockIndex, { blockIndex: item.blockIndex, start: elapsed, end: elapsed });
    this.marksCache = [];
  }

  private closePass(blockIndex: number, elapsed: number): void {
    const pass = this.passes.get(blockIndex);
    if (pass) pass.end = elapsed;
    this.marksCache = [];
  }

  private enterTail(elapsed: number): void {
    const last = this.timeline.items[this.itemIndex];
    if (last) this.closePass(last.blockIndex, elapsed);
    this.phase = 'tail';
    this.tailStartedAt = elapsed;
  }

  private finish(elapsed: number): void {
    this.phase = 'finished';
    this.holding = false;
    this.finishedElapsed = elapsed;
    this.marksCache = [];
    if (this.frame !== null) this.clock.cancelFrame(this.frame);
    this.frame = null;
    this.emit(elapsed);
  }

  private emit(elapsed = this.elapsedNow()): void {
    this.snapshot = this.computeSnapshot(elapsed);
    this.listeners.forEach((listener) => listener());
  }

  private marks(): BlockMark[] {
    if (this.marksCache.length !== this.passes.size) {
      this.marksCache = [...this.passes.values()]
        .sort((a, b) => a.blockIndex - b.blockIndex)
        .map((pass) => ({ ...pass }));
    }
    return this.marksCache;
  }

  private computeSnapshot(elapsed: number): PrompterSnapshot {
    const { items } = this.timeline;
    const showing = this.phase === 'running' || this.phase === 'ready' || this.phase === 'countdown';
    const index = Math.max(0, this.itemIndex);
    const current = showing ? (items[index] ?? null) : null;
    const next = showing ? (items[index + 1] ?? null) : null;
    const blockIndex = current?.blockIndex ?? this.timeline.lastBlock;
    const blockDuration = this.blockDurations.get(blockIndex) ?? 0;

    let blockProgress = 0;
    if (this.phase === 'running' && blockDuration > 0) {
      const position =
        this.mode === 'timed'
          ? this.scriptTime - (this.timeline.blockStarts.get(blockIndex) ?? 0)
          : elapsed - (this.passes.get(blockIndex)?.start ?? elapsed);
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
      marks: this.marks(),
      incomplete: this.incomplete,
    };
  }
}
