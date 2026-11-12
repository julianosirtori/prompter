/** Scripts and settings in localStorage. Every access is guarded: storage can be unavailable. */
import type { AdvanceMode } from '../engine/prompter';
import type { Facing } from '../media/camera';
import type { Script } from '../domain/types';

const KEYS = { scripts: 'prompter.scripts.v1', settings: 'prompter.settings.v1' } as const;
const MAX_RECENT_SCRIPTS = 10;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app keeps working for this session.
  }
};

export const loadScripts = (): Script[] =>
  readJson<Script[]>(KEYS.scripts, []).sort((a, b) => b.updatedAt - a.updatedAt);

export const loadScript = (id: string): Script | undefined => loadScripts().find((script) => script.id === id);

/** Saves or replaces a script, keeping only the most recent ones. Returns the scripts dropped. */
export const saveScript = (script: Script): Script[] => {
  const others = loadScripts().filter((existing) => existing.id !== script.id);
  const all = [script, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
  writeJson(KEYS.scripts, all.slice(0, MAX_RECENT_SCRIPTS));
  return all.slice(MAX_RECENT_SCRIPTS);
};

export const deleteScript = (id: string): void => {
  writeJson(
    KEYS.scripts,
    loadScripts().filter((script) => script.id !== id),
  );
};

export type RecordingMode = 'camera' | 'prompter';
export type TextSize = 'sm' | 'md' | 'lg';

export interface Settings {
  recordingMode: RecordingMode;
  advance: AdvanceMode;
  /** 0.8–1.2 */
  speed: number;
  textSize: TextSize;
  facing: Facing;
  videoDeviceId?: string;
  audioDeviceId?: string;
  mirrorText: boolean;
  /** 5s countdown, for pressing record on another device. */
  longCountdown: boolean;
  /** Shows "+1,2s" drift while recording, not only while rehearsing. */
  showDriftWhileRecording: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  recordingMode: 'camera',
  advance: 'timed',
  speed: 1,
  textSize: 'md',
  facing: 'user',
  mirrorText: false,
  longCountdown: false,
  showDriftWhileRecording: false,
};

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(KEYS.settings, {}) });

export const saveSettings = (settings: Settings): void => writeJson(KEYS.settings, settings);
