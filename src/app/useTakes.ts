import { useCallback, useEffect, useState } from 'react';
import type { Take } from '../domain/take';
import { deleteTake, listTakes, updateTake } from '../storage/takes';

export interface TakesState {
  takes: readonly Take[];
  loading: boolean;
  update(take: Take): Promise<void>;
  remove(takeId: string): Promise<void>;
}

/** Takes of one script, loaded from IndexedDB and kept in sync with local edits. */
export const useTakes = (scriptId: string): TakesState => {
  const [state, setState] = useState<{ scriptId: string; takes: Take[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTakes(scriptId)
      .catch((): Take[] => [])
      .then((takes) => {
        if (!cancelled) setState({ scriptId, takes });
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  const update = useCallback(async (take: Take) => {
    await updateTake(take);
    setState((current) =>
      current && { ...current, takes: current.takes.map((existing) => (existing.id === take.id ? take : existing)) },
    );
  }, []);

  const remove = useCallback(async (takeId: string) => {
    await deleteTake(takeId);
    setState((current) => current && { ...current, takes: current.takes.filter((take) => take.id !== takeId) });
  }, []);

  const loaded = state?.scriptId === scriptId;
  return { takes: loaded ? state.takes : [], loading: !loaded, update, remove };
};
