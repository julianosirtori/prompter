import { useCallback, useMemo, useState } from 'react';
import type { Script } from '../domain/types';
import { deleteScript, loadScripts, saveScript } from '../storage/local';
import { deleteTakesOf } from '../storage/takes';

const MAX_RECENT = 10;

export interface ScriptStore {
  scripts: readonly Script[];
  find(id: string): Script | undefined;
  save(script: Script): void;
  remove(id: string): void;
}

const dropTakes = (scriptId: string): void => {
  void deleteTakesOf(scriptId).catch(() => undefined);
};

/** Scripts live in localStorage; this keeps a copy in state so edits render immediately. */
export const useScripts = (): ScriptStore => {
  const [scripts, setScripts] = useState<Script[]>(loadScripts);

  const save = useCallback((script: Script) => {
    saveScript(script).forEach((dropped) => dropTakes(dropped.id));
    setScripts((current) =>
      [script, ...current.filter((existing) => existing.id !== script.id)]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_RECENT),
    );
  }, []);

  const remove = useCallback((id: string) => {
    deleteScript(id);
    dropTakes(id);
    setScripts((current) => current.filter((script) => script.id !== id));
  }, []);

  return useMemo(
    () => ({ scripts, find: (id: string) => scripts.find((script) => script.id === id), save, remove }),
    [scripts, save, remove],
  );
};
