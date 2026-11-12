import { useMemo, useState } from 'react';
import { clampRange, isFullRange } from '../../app/sessionAdapters';
import type { SessionKind } from '../../app/router';
import type { UpdateSettings } from '../../app/useSettings';
import type { BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import { isRecordingSupported } from '../../media/recorder';
import type { Settings } from '../../storage/local';
import { stepSpeed } from '../session/speed';
import { PrompterSession } from './PrompterSession';
import type { SessionMode } from './sessionMode';
import { usePrompter } from './usePrompter';
import './prompter.css';

interface PrompterScreenProps {
  script: Script;
  kind: SessionKind;
  /** Null records or rehearses the whole script. */
  range: BlockRange | null;
  settings: Settings;
  onSettings: UpdateSettings;
  onSaveScript(script: Script): void;
}

const COUNTDOWN_SECONDS = 3;
const LONG_COUNTDOWN_SECONDS = 5;
/** Breath after the last block of a full take; a re-recorded block gets 1s on each side. */
const FULL_TAIL_SECONDS = 1.5;
const BLOCK_TAIL_SECONDS = 1;

/** One screen for rehearsal, recording with the camera and prompter-only runs. */
export function PrompterScreen({ script, kind, range, settings, onSettings, onSaveScript }: PrompterScreenProps) {
  const [promptOnly, setPromptOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const activeRange = useMemo(() => clampRange(script.blocks, range), [script.blocks, range]);
  const complete = isFullRange(script.blocks, activeRange);
  const withCamera = settings.recordingMode === 'camera' && !promptOnly && isRecordingSupported();
  const mode: SessionMode = kind === 'rehearsal' ? 'rehearsal' : withCamera ? 'camera' : 'prompter';

  const tailSeconds = mode === 'rehearsal' ? 0 : complete ? FULL_TAIL_SECONDS : BLOCK_TAIL_SECONDS;
  const prompter = usePrompter({
    blocks: script.blocks,
    from: activeRange.from,
    to: activeRange.to,
    mode: settings.advance,
    speed: settings.speed,
    countdownSeconds: mode === 'prompter' && settings.longCountdown ? LONG_COUNTDOWN_SECONDS : COUNTDOWN_SECONDS,
    tailSeconds,
    attempt,
  });

  return (
    <PrompterSession
      key={`${mode}-${attempt}`}
      script={script}
      range={activeRange}
      mode={mode}
      settings={settings}
      prompter={prompter}
      onRestart={() => setAttempt((current) => current + 1)}
      onPromptOnly={() => setPromptOnly(true)}
      onSpeed={(direction) => onSettings({ speed: stepSpeed(settings.speed, direction) })}
      onForgetDevices={() => onSettings({ videoDeviceId: undefined, audioDeviceId: undefined })}
      onSaveScript={onSaveScript}
    />
  );
}
