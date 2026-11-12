import { useEffect, useMemo, useRef } from 'react';
import { createTake } from '../../app/sessionAdapters';
import type { Take } from '../../domain/take';
import type { BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import type { PrompterSnapshot } from '../../engine/prompter';
import { TakeRecorder } from '../../media/recorder';
import { isQuotaError } from '../../storage/idb';
import { listTakes, requestPersistence, saveTake } from '../../storage/takes';
import type { SessionMode } from './sessionMode';

export type FinalizeResult =
  /** Stopped before any block was shown: there is nothing to keep. */
  | { kind: 'discarded' }
  | { kind: 'rehearsed' }
  /** `recordingFailed`: the recorder errored and the take holds what was captured until then. */
  | { kind: 'saved'; take: Take; recordingFailed: boolean }
  | { kind: 'quota' }
  | { kind: 'failed' };

export interface TakeFinalizer {
  /** Camera mode: resolves true once the recorder is really recording. */
  startRecording(stream: MediaStream): Promise<boolean>;
  /**
   * Closes the recording and stores the take. Runs once per session and never looks at whether
   * the screen is still mounted: leaving the screen must not lose a take.
   */
  finalize(final: PrompterSnapshot): Promise<FinalizeResult>;
  /** Leaving before anything worth keeping: frees the recorder. */
  abandon(): void;
}

interface Session {
  mode: SessionMode;
  script: Script;
  range: BlockRange;
}

const persist = async (session: Session, final: PrompterSnapshot, recorder: TakeRecorder | null): Promise<FinalizeResult> => {
  const nothingShown = final.marks.length === 0;
  if (session.mode === 'rehearsal') return { kind: nothingShown ? 'discarded' : 'rehearsed' };
  try {
    const recorded = recorder ? await recorder.stop() : null;
    if (nothingShown) return { kind: recorded?.failed ? 'failed' : 'discarded' };
    const take = createTake({
      script: session.script,
      existing: await listTakes(session.script.id),
      kind: session.mode === 'camera' ? 'camera' : 'prompter',
      range: session.range,
      snapshot: final,
      recorded,
    });
    await saveTake(take, recorded?.blob);
    void requestPersistence();
    return { kind: 'saved', take, recordingFailed: recorded?.failed ?? false };
  } catch (error) {
    return { kind: isQuotaError(error) ? 'quota' : 'failed' };
  }
};

/** Owns the recorder and the persistence of one session's take, apart from what the screen shows. */
export const useTakeFinalizer = (mode: SessionMode, script: Script, range: BlockRange): TakeFinalizer => {
  const recorder = useRef<TakeRecorder | null>(null);
  const result = useRef<Promise<FinalizeResult> | null>(null);
  const mounted = useRef(true);
  const session = useRef<Session>({ mode, script, range });

  useEffect(() => {
    session.current = { mode, script, range };
  }, [mode, script, range]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useMemo<TakeFinalizer>(
    () => ({
      startRecording: async (stream) => {
        const next = new TakeRecorder(stream);
        try {
          await next.start();
        } catch {
          next.discard();
          return false;
        }
        // The screen went away while the recorder was starting: no take was begun.
        if (!mounted.current) {
          next.discard();
          return false;
        }
        recorder.current = next;
        return true;
      },
      finalize: (final) => {
        if (!result.current) {
          const active = recorder.current;
          recorder.current = null;
          result.current = persist(session.current, final, active);
        }
        return result.current;
      },
      abandon: () => {
        recorder.current?.discard();
        recorder.current = null;
      },
    }),
    [],
  );
};
