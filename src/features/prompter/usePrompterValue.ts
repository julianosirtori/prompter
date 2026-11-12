import { useSyncExternalStore } from 'react';
import type { Prompter, PrompterSnapshot } from '../../engine/prompter';

/**
 * Subscribes to one value of the engine. The engine emits on every frame; returning a primitive
 * here means the component only re-renders when that value changes (the phase, a block index),
 * not 60 times a second.
 */
export const usePrompterValue = <T extends string | number | boolean | null>(
  prompter: Prompter,
  select: (snapshot: PrompterSnapshot) => T,
): T => useSyncExternalStore(prompter.subscribe, () => select(prompter.getSnapshot()));

/** The whole snapshot, for the few components that really change every frame. */
export const usePrompterSnapshot = (prompter: Prompter): PrompterSnapshot =>
  useSyncExternalStore(prompter.subscribe, prompter.getSnapshot);
