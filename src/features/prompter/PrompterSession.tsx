import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { preciseSeconds } from '../../app/copy';
import { setFlash, takeFlashKey } from '../../app/flash';
import { goBack, navigate } from '../../app/router';
import type { Take } from '../../domain/take';
import { contextBefore, type BlockMark, type BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import type { Prompter, PrompterSnapshot } from '../../engine/prompter';
import { toggleFullscreen } from '../../media/device';
import type { Settings } from '../../storage/local';
import { CameraPreview } from './CameraPreview';
import { DriftBadge } from './DriftBadge';
import { PrompterDone } from './PrompterDone';
import { RehearsalSummary } from './RehearsalSummary';
import { SessionDock, type DockActions, type DockView } from './SessionDock';
import type { SessionMode } from './sessionMode';
import { Strip } from './Strip';
import { useCamera } from './useCamera';
import { useGestures, type GestureHandlers } from './useGestures';
import { usePrompterKeys, type PrompterKeyHandlers } from './usePrompterKeys';
import { usePrompterValue } from './usePrompterValue';
import { useSilentAutoAdvance } from './useSilentAutoAdvance';
import { useTakeFinalizer, type FinalizeResult } from './useTakeFinalizer';
import { useWakeLock } from './useWakeLock';

type Outcome =
  | { kind: 'active' }
  /** The recorder failed; a partial take may have been saved. */
  | { kind: 'failed' }
  | { kind: 'quota' }
  /** Marks are frozen here: the summary must not follow an engine that may be replaced. */
  | { kind: 'rehearsed'; marks: BlockMark[]; incomplete: boolean }
  | { kind: 'prompted'; take: Take };

/** Why a take ended before its last block, for the message on the take review. */
type StopReason = 'user' | 'backgrounded' | 'camera-lost';

interface PrompterSessionProps {
  script: Script;
  range: BlockRange;
  mode: SessionMode;
  settings: Settings;
  prompter: Prompter;
  /** Throws this attempt away and starts a fresh one. */
  onRestart(): void;
  /** Gives up on the camera for this session. */
  onPromptOnly(): void;
  onSpeed(direction: 1 | -1): void;
  /** The saved camera or microphone no longer exists. */
  onForgetDevices(): void;
  onSaveScript(script: Script): void;
}

const savedText = (take: Take, final: PrompterSnapshot, reason: StopReason): string => {
  const lastBlock = (final.marks.at(-1)?.blockIndex ?? take.range.from) + 1;
  if (reason === 'backgrounded') return `A gravação parou porque o app saiu da tela. O take foi salvo até o bloco ${lastBlock}.`;
  if (reason === 'camera-lost') return `A câmera parou de responder. O take foi salvo até o bloco ${lastBlock}.`;
  return `Take ${take.number} salvo · ${preciseSeconds(take.duration)}`;
};

export function PrompterSession({
  script,
  range,
  mode,
  settings,
  prompter,
  onRestart,
  onPromptOnly,
  onSpeed,
  onForgetDevices,
  onSaveScript,
}: PrompterSessionProps) {
  const phase = usePrompterValue(prompter, (snapshot) => snapshot.phase);
  const live = phase === 'countdown' || phase === 'running' || phase === 'tail';

  const [outcome, setOutcome] = useState<Outcome>({ kind: 'active' });
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const handled = useRef(false);
  const stopReason = useRef<StopReason>('user');
  const alive = useRef(true);

  const finalizer = useTakeFinalizer(mode, script, range);

  // Declared before useCamera on purpose: React runs unmount cleanups in declaration order, so
  // the recorder stops before the camera tracks do (Safari may fail a take whose tracks end first).
  // Leaving the screen mid-take (Android back, iOS edge swipe) closes the take and keeps it,
  // exactly like the app going to the background. Before the take starts there is nothing to keep.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const current = prompter.getSnapshot().phase;
      if (current === 'ready') {
        finalizer.abandon();
        return;
      }
      prompter.stop();
      void finalizer.finalize(prompter.getSnapshot());
    };
  }, [prompter, finalizer]);

  const cameraRequest = useMemo(
    () => ({ facing: settings.facing, videoDeviceId: settings.videoDeviceId, audioDeviceId: settings.audioDeviceId }),
    [settings.facing, settings.videoDeviceId, settings.audioDeviceId],
  );
  const { state: cameraState, open: openCamera } = useCamera(mode === 'camera', cameraRequest, onForgetDevices);
  const stream = cameraState.status === 'ready' ? cameraState.stream : null;

  /** The run ended and its take is being stored; the result replaces this state when it arrives. */
  const saving = outcome.kind === 'active' && phase === 'finished' && mode !== 'rehearsal';
  const active = outcome.kind === 'active' && !saving;
  const canStart = active && phase === 'ready' && !starting && (mode !== 'camera' || stream !== null);
  const scriptId = script.id;

  const exit = useCallback(
    () => goBack({ name: 'review', scriptId }, (previous) => previous.name === 'takes' && previous.scriptId === scriptId),
    [scriptId],
  );

  /** The recorder must really be recording before the take clock starts, so marks match the file. */
  const start = useCallback(async () => {
    if (!canStart || startingRef.current) return;
    if (mode === 'camera' && stream) {
      startingRef.current = true;
      setStarting(true);
      const recording = await finalizer.startRecording(stream);
      if (!alive.current) return;
      if (!recording) {
        setOutcome({ kind: 'failed' });
        return;
      }
      // The camera may have died or the app gone to the background while the recorder started;
      // the stop effects only watch running takes, so check here instead of reading to a dead camera.
      const cameraEnded = stream.getVideoTracks().some((track) => track.readyState === 'ended');
      if (cameraEnded || document.hidden) {
        finalizer.abandon();
        startingRef.current = false;
        setStarting(false);
        return;
      }
      setStarting(false);
    }
    prompter.start();
  }, [canStart, mode, stream, finalizer, prompter]);

  const stop = useCallback(() => {
    if (prompter.getSnapshot().phase === 'ready') exit();
    else prompter.stop();
  }, [prompter, exit]);

  const keys = useMemo<PrompterKeyHandlers>(
    () => ({
      onPrimary: () => {
        if (prompter.getSnapshot().phase === 'ready') void start();
        else prompter.advance();
      },
      onBack: () => prompter.back(),
      onHold: (holding) => prompter.setHolding(holding),
      onStop: stop,
      onFullscreen: () => void toggleFullscreen(),
      // Jumping and changing speed would break the marks of a real take: rehearsal only.
      onJump: (blockNumber) => {
        if (mode === 'rehearsal' && blockNumber <= range.to - range.from + 1) prompter.jumpToBlock(range.from + blockNumber - 1);
      },
      // The engine's speed is fixed per run, so it can only change before the rehearsal starts.
      onSpeed: (direction) => {
        if (mode === 'rehearsal' && prompter.getSnapshot().phase === 'ready') onSpeed(direction);
      },
    }),
    [prompter, start, stop, mode, range, onSpeed],
  );
  usePrompterKeys(keys, active);

  const gestureHandlers = useMemo<GestureHandlers>(
    () => ({
      onTap: () => prompter.advance(),
      onHold: (holding) => prompter.setHolding(holding),
      onSwipeBack: () => prompter.back(),
    }),
    [prompter],
  );
  const gestures = useGestures(gestureHandlers);
  useSilentAutoAdvance(prompter, settings.advance === 'manual');
  useWakeLock(active && phase !== 'finished');

  // iOS suspends the camera when the app leaves the screen: close the take with what was recorded.
  useEffect(() => {
    if (mode !== 'camera') return;
    const onVisibility = () => {
      const current = prompter.getSnapshot().phase;
      if (document.hidden && current !== 'ready' && current !== 'finished') {
        stopReason.current = 'backgrounded';
        prompter.stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mode, prompter]);

  // Webcam unplugged or camera taken away mid-take: same treatment.
  const cameraLost = mode === 'camera' && cameraState.status === 'error';
  useEffect(() => {
    if (!cameraLost) return;
    const current = prompter.getSnapshot().phase;
    if (current !== 'ready' && current !== 'finished') {
      stopReason.current = 'camera-lost';
      prompter.stop();
    }
  }, [cameraLost, prompter]);

  const showResult = useCallback(
    (result: FinalizeResult, final: PrompterSnapshot) => {
      switch (result.kind) {
        case 'discarded':
          onRestart();
          return;
        case 'rehearsed':
          setOutcome({ kind: 'rehearsed', marks: final.marks, incomplete: final.incomplete });
          return;
        case 'quota':
        case 'failed':
          setOutcome({ kind: result.kind });
          return;
        case 'saved':
          if (result.recordingFailed) {
            setOutcome({ kind: 'failed' });
          } else if (result.take.kind === 'camera') {
            setFlash(takeFlashKey(result.take.id), savedText(result.take, final, stopReason.current));
            navigate({ name: 'takes', scriptId, takeId: result.take.id }, { replace: true });
          } else {
            setOutcome({ kind: 'prompted', take: result.take });
          }
      }
    },
    [onRestart, scriptId],
  );

  useEffect(() => {
    if (phase !== 'finished' || handled.current) return;
    handled.current = true;
    const final = prompter.getSnapshot();
    // Saving happens whether or not this screen is still here; only showing the result needs it.
    void finalizer.finalize(final).then((result) => {
      if (alive.current) showResult(result, final);
    });
  }, [phase, prompter, finalizer, showResult]);

  const actions = useMemo<DockActions>(
    () => ({
      onStart: () => void start(),
      onStop: stop,
      onExit: exit,
      onRestart,
      onPromptOnly,
      onOpenCamera: () => void openCamera(),
      onTakes: () => navigate({ name: 'takes', scriptId, takeId: null }, { replace: true }),
    }),
    [start, stop, exit, onRestart, onPromptOnly, openCamera, scriptId],
  );

  if (outcome.kind === 'rehearsed') {
    return (
      <RehearsalSummary
        script={script}
        range={range}
        marks={outcome.marks}
        measured={settings.advance === 'manual'}
        incomplete={outcome.incomplete}
        onAgain={onRestart}
        onSaveScript={onSaveScript}
      />
    );
  }
  if (outcome.kind === 'prompted') return <PrompterDone script={script} take={outcome.take} onAgain={onRestart} />;

  const opening = mode === 'camera' && (cameraState.status === 'checking' || cameraState.status === 'opening');
  const busy = opening || starting;
  const status = saving ? 'Salvando take…' : active && busy ? 'Abrindo a câmera…' : null;

  let view: DockView = { kind: 'none' };
  if (outcome.kind === 'failed' || outcome.kind === 'quota') view = { kind: outcome.kind };
  else if (saving || busy) view = { kind: 'none' };
  else if (mode === 'camera' && (cameraState.status === 'explain' || cameraState.status === 'error')) view = { kind: 'camera', state: cameraState };
  else if (phase === 'ready') view = { kind: 'ready', canStart };
  else if (live) view = { kind: 'live' };

  const showDrift = settings.advance === 'timed' && (mode === 'rehearsal' || settings.showDriftWhileRecording);

  return (
    <div className="stage" data-mode={mode} data-live={live} data-size={settings.textSize} {...gestures}>
      {stream && <CameraPreview stream={stream} />}
      <Strip
        prompter={prompter}
        context={contextBefore(script.blocks, range)}
        status={status}
        mirror={settings.mirrorText}
        editNotesOf={mode === 'rehearsal' && phase === 'running' ? script.blocks : null}
      />
      {mode === 'rehearsal' && <span className="stage__badge">ENSAIO</span>}
      {showDrift && <DriftBadge prompter={prompter} />}
      <SessionDock view={view} mode={mode} advance={settings.advance} prompter={prompter} actions={actions} />
      <p className="stage__rotate" role="alert">
        Gire o celular para a vertical.
      </p>
    </div>
  );
}
