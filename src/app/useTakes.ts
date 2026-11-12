import { useCallback, useEffect, useRef, useState } from 'react';
import type { Take } from '../domain/take';
import { deleteTake, listTakes, updateTake } from '../storage/takes';

export interface TakesState {
  takes: readonly Take[];
  loading: boolean;
  /** Last write that failed, in words for the user. */
  error: string | null;
  /** Shows the change at once and rolls it back if it cannot be stored. */
  update(take: Take): void;
  /** Resolves true once the take is gone. */
  remove(takeId: string): Promise<boolean>;
  /** Take being deleted, to disable its controls meanwhile. */
  removing: string | null;
}

interface Loaded {
  scriptId: string;
  takes: Take[];
}

const replaceTake = (takes: Take[], take: Take): Take[] =>
  takes.map((existing) => (existing.id === take.id ? take : existing));

/** Takes of one script, loaded from IndexedDB and kept in sync with local edits. */
export const useTakes = (scriptId: string): TakesState => {
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  /** What IndexedDB holds for each take, to roll back to when a write fails. */
  const stored = useRef(new Map<string, Take>());
  /** Writes of one take run in order, so quick taps cannot land out of order. */
  const queue = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    let cancelled = false;
    listTakes(scriptId)
      .catch((): Take[] => [])
      .then((takes) => {
        if (cancelled) return;
        stored.current = new Map(takes.map((take) => [take.id, take]));
        setState({ scriptId, takes });
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  const update = useCallback((take: Take) => {
    setError(null);
    setState((current) => current && { ...current, takes: replaceTake(current.takes, take) });
    const previous = queue.current.get(take.id) ?? Promise.resolve();
    const write = previous
      .then(() => updateTake(take))
      .then(() => {
        stored.current.set(take.id, take);
      })
      .catch(() => {
        // A newer write is queued: it will settle the screen, so do not roll back over it.
        if (queue.current.get(take.id) !== write) {
          setError('Não consegui salvar a alteração neste take. Tente de novo.');
          return;
        }
        const good = stored.current.get(take.id);
        if (good) setState((current) => current && { ...current, takes: replaceTake(current.takes, good) });
        setError('Não consegui salvar a alteração neste take. Tente de novo.');
      });
    queue.current.set(take.id, write);
  }, []);

  const remove = useCallback(async (takeId: string) => {
    setError(null);
    setRemoving(takeId);
    try {
      // Let pending edits land first, or a late `put` would bring the take back without its video.
      await queue.current.get(takeId)?.catch(() => undefined);
      queue.current.delete(takeId);
      await deleteTake(takeId);
      stored.current.delete(takeId);
      setState((current) => current && { ...current, takes: current.takes.filter((take) => take.id !== takeId) });
      return true;
    } catch {
      setError('Não consegui apagar o take. Tente de novo.');
      return false;
    } finally {
      setRemoving(null);
    }
  }, []);

  const loaded = state?.scriptId === scriptId;
  return { takes: loaded ? state.takes : [], loading: !loaded, error, update, remove, removing };
};
