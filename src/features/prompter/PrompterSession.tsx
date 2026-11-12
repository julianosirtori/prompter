import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { preciseSeconds, signedSeconds } from '../../app/copy';
import { setFlash, takeFlashKey } from '../../app/flash';
import { navigate } from '../../app/router';
import { createTake, jumpToBlock } from '../../app/sessionAdapters';
import type { Take } from '../../domain/take';
import { contextBefore, type BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import type { Prompter, PrompterSnapshot } from '../../engine/prompter';
import { isIOS, toggleFullscreen } from '../../media/device';
import { TakeRecorder } from '../../media/recorder';
import { isQuotaError } from '../../storage/idb';
import type { Settings } from '../../storage/local';
import { listTakes, requestPersistence, saveTake } from '../../storage/takes';
import { Button } from '../../ui/Button';
import { CameraPreview } from './CameraPreview';
import { PrompterDone } from './PrompterDone';
import { RehearsalSummary } from './RehearsalSummary';
import { DockMessage, LivePanel, ReadyPanel } from './SessionDock';
import type { SessionMode } from './sessionMode';
import { Strip } from './Strip';
import { useCamera } from './useCamera';
import { useGestures } from './useGestures';
import { usePrompterKeys } from './usePrompterKeys';
import { useSilentAutoAdvance } from './useSilentAutoAdvance';
import { useWakeLock } from './useWakeLock';

type Outcome =
  | { kind: 'active' }
  | { kind: 'saving' }
  /** The recorder failed; a partial take may have been saved. */
  | { kind: 'failed' }
  | { kind: 'quota' }
  | { kind: 'rehearsed' }
  | { kind: 'prompted'; take: Take };

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

const DENIED_TEXT = {
  ios: 'Câmera bloqueada. Vá em Ajustes > Safari > Câmera e escolha Permitir. Depois recarregue.',
  desktop: 'Câmera bloqueada. Clique no cadeado ao lado do endereço e libere câmera e microfone.',
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
  const snapshot = useSyncExternalStore(prompter.subscribe, prompter.getSnapshot);
  const { phase } = snapshot;
  const live = phase === 'countdown' || phase === 'running' || phase === 'tail';

  const [outcome, setOutcome] = useState<Outcome>({ kind: 'active' });
  const [starting, setStarting] = useState(false);
  const recorderRef = useRef<TakeRecorder | null>(null);
  const startingRef = useRef(false);
  const finalized = useRef(false);
  const backgrounded = useRef(false);
  const alive = useRef(true);

  const cameraRequest = useMemo(
    () => ({ facing: settings.facing, videoDeviceId: settings.videoDeviceId, audioDeviceId: settings.audioDeviceId }),
    [settings.facing, settings.videoDeviceId, settings.audioDeviceId],
  );
  const camera = useCamera(mode === 'camera', cameraRequest, onForgetDevices);
  const stream = camera.state.status === 'ready' ? camera.state.stream : null;

  const active = outcome.kind === 'active';
  const canStart = active && phase === 'ready' && !starting && (mode !== 'camera' || stream !== null);

  const exit = useCallback(() => navigate({ name: 'review', scriptId: script.id }, { replace: true }), [script.id]);

  /** The recorder must really be recording before the take clock starts, so marks match the file. */
  const start = useCallback(async () => {
    if (!canStart || startingRef.current) return;
    if (mode === 'camera' && stream) {
      startingRef.current = true;
      setStarting(true);
      const recorder = new TakeRecorder(stream);
      try {
        await recorder.start();
      } catch {
        recorder.discard();
        if (alive.current) setOutcome({ kind: 'failed' });
        return;
      }
      if (!alive.current) {
        recorder.discard();
        return;
      }
      recorderRef.current = recorder;
      setStarting(false);
    }
    prompter.start();
  }, [canStart, mode, stream, prompter]);

  const stop = useCallback(() => {
    if (prompter.getSnapshot().phase === 'ready') exit();
    else prompter.stop();
  }, [prompter, exit]);

  const primary = useCallback(() => {
    if (prompter.getSnapshot().phase === 'ready') void start();
    else prompter.advance();
  }, [prompter, start]);

  const setHolding = useCallback((holding: boolean) => prompter.setHolding(holding), [prompter]);

  usePrompterKeys(
    {
      onPrimary: primary,
      onBack: () => prompter.back(),
      onHold: setHolding,
      onStop: stop,
      onFullscreen: () => void toggleFullscreen(),
      onJump: (blockNumber) => {
        // Jumping would break the block marks of a real take, so it is a rehearsal-only shortcut.
        if (mode === 'rehearsal') jumpToBlock(prompter, script.blocks, range, range.from + blockNumber - 1);
      },
      onSpeed: (direction) => {
        // The engine's speed is fixed per run, so it can only change before the rehearsal starts.
        if (mode === 'rehearsal' && prompter.getSnapshot().phase === 'ready') onSpeed(direction);
      },
    },
    active,
  );
  const gestures = useGestures({ onTap: () => prompter.advance(), onHold: setHolding, onSwipeBack: () => prompter.back() });
  useSilentAutoAdvance(prompter, snapshot, settings.advance === 'manual');
  useWakeLock(active && phase !== 'finished');

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      // Leaving mid-take: nothing is saved, the crop pipeline is freed.
      recorderRef.current?.discard();
      recorderRef.current = null;
    };
  }, []);

  // iOS suspends the camera when the app leaves the screen: close the take with what was recorded.
  useEffect(() => {
    if (mode !== 'camera') return;
    const onVisibility = () => {
      const current = prompter.getSnapshot().phase;
      if (document.hidden && current !== 'ready' && current !== 'finished') {
        backgrounded.current = true;
        prompter.stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mode, prompter]);

  const finalize = useCallback(
    async (final: PrompterSnapshot) => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      const nothingShown = final.marks.length === 0;

      if (mode === 'rehearsal') {
        if (nothingShown) onRestart();
        else setOutcome({ kind: 'rehearsed' });
        return;
      }

      setOutcome({ kind: 'saving' });
      try {
        const recorded = recorder ? await recorder.stop() : null;
        if (!alive.current) return;
        if (nothingShown) {
          // Stopped during the countdown: there is no take to keep.
          if (recorded?.failed) setOutcome({ kind: 'failed' });
          else onRestart();
          return;
        }
        const take = createTake({
          script,
          existing: await listTakes(script.id),
          kind: mode === 'camera' ? 'camera' : 'prompter',
          range,
          snapshot: final,
          recorded,
        });
        await saveTake(take, recorded?.blob);
        void requestPersistence();
        if (!alive.current) return;

        if (recorded?.failed) {
          // The partial take is saved and listed; the screen explains what happened.
          setOutcome({ kind: 'failed' });
        } else if (mode === 'camera') {
          const lastBlock = (final.marks.at(-1)?.blockIndex ?? range.from) + 1;
          setFlash(
            takeFlashKey(take.id),
            backgrounded.current
              ? `A gravação parou porque o app saiu da tela. O take foi salvo até o bloco ${lastBlock}.`
              : `Take ${take.number} salvo · ${preciseSeconds(take.duration)}`,
          );
          navigate({ name: 'takes', scriptId: script.id, takeId: take.id }, { replace: true });
        } else {
          setOutcome({ kind: 'prompted', take });
        }
      } catch (error) {
        if (alive.current) setOutcome({ kind: isQuotaError(error) ? 'quota' : 'failed' });
      }
    },
    [mode, onRestart, range, script],
  );

  useEffect(() => {
    if (phase !== 'finished' || finalized.current) return;
    finalized.current = true;
    void finalize(prompter.getSnapshot());
  }, [phase, finalize, prompter]);

  if (outcome.kind === 'rehearsed') {
    return (
      <RehearsalSummary
        script={script}
        range={range}
        marks={snapshot.marks}
        measured={settings.advance === 'manual'}
        incomplete={snapshot.incomplete}
        onAgain={onRestart}
        onSaveScript={onSaveScript}
      />
    );
  }
  if (outcome.kind === 'prompted') return <PrompterDone script={script} take={outcome.take} onAgain={onRestart} />;

  const cameraStatus = mode === 'camera' ? camera.state.status : 'ready';
  const opening = cameraStatus === 'checking' || cameraStatus === 'opening' || starting;
  const status = outcome.kind === 'saving' ? 'Salvando take…' : active && opening ? 'Abrindo a câmera…' : null;

  const currentBlock = snapshot.current ? script.blocks[snapshot.current.blockIndex] : undefined;
  const showDrift =
    phase === 'running' &&
    settings.advance === 'timed' &&
    (mode === 'rehearsal' || settings.showDriftWhileRecording) &&
    Math.abs(snapshot.drift) >= 0.1;
  const toTakes = () => navigate({ name: 'takes', scriptId: script.id, takeId: null }, { replace: true });

  const dock = () => {
    if (outcome.kind === 'failed') {
      return (
        <DockMessage text="A gravação falhou. Tente de novo ou use só como prompter.">
          <Button variant="primary" onClick={onRestart}>
            Tentar de novo
          </Button>
          <Button onClick={onPromptOnly}>Só prompter</Button>
          <Button variant="ghost" onClick={toTakes}>
            Ver takes
          </Button>
        </DockMessage>
      );
    }
    if (outcome.kind === 'quota') {
      return (
        <DockMessage text="Sem espaço para guardar o take. Baixe ou apague takes antigos.">
          <Button variant="primary" onClick={toTakes}>
            Ver takes
          </Button>
        </DockMessage>
      );
    }
    if (outcome.kind === 'saving' || opening) return null;
    if (camera.state.status === 'explain' && mode === 'camera') {
      return (
        <DockMessage text="Preciso da câmera e do microfone para gravar. O vídeo fica só no seu aparelho.">
          <Button variant="primary" onClick={() => void camera.open()}>
            Permitir
          </Button>
          <Button onClick={onPromptOnly}>Usar só como prompter</Button>
          <Button variant="ghost" onClick={exit}>
            Voltar
          </Button>
        </DockMessage>
      );
    }
    if (camera.state.status === 'error' && mode === 'camera') {
      const { kind } = camera.state;
      const text =
        kind === 'denied'
          ? DENIED_TEXT[isIOS() ? 'ios' : 'desktop']
          : kind === 'in-use'
            ? 'A câmera está sendo usada por outro app. Feche-o e tente de novo.'
            : kind === 'unsupported'
              ? 'Este navegador não dá acesso à câmera. Use só como prompter.'
              : 'Não encontrei uma câmera para gravar. Conecte uma e tente de novo.';
      return (
        <DockMessage text={text}>
          <Button variant="primary" onClick={onPromptOnly}>
            Usar só como prompter
          </Button>
          {kind !== 'unsupported' && <Button onClick={() => void camera.open()}>Tentar de novo</Button>}
          <Button variant="ghost" onClick={exit}>
            Voltar
          </Button>
        </DockMessage>
      );
    }
    if (phase === 'ready') {
      return <ReadyPanel mode={mode} advance={settings.advance} canStart={canStart} onStart={() => void start()} onExit={exit} />;
    }
    if (live) return <LivePanel mode={mode} snapshot={snapshot} onStop={stop} />;
    return null;
  };

  return (
    <div className="stage" data-mode={mode} data-live={live} data-size={settings.textSize} {...gestures}>
      {stream && <CameraPreview stream={stream} />}
      <Strip
        snapshot={snapshot}
        context={contextBefore(script.blocks, range)}
        status={status}
        mirror={settings.mirrorText}
        editNote={mode === 'rehearsal' && phase === 'running' ? currentBlock?.edit || null : null}
      />
      {mode === 'rehearsal' && <span className="stage__badge">ENSAIO</span>}
      {showDrift && (
        <span className="stage__drift" aria-label="Desvio em relação ao roteiro">
          {signedSeconds(snapshot.drift)}
        </span>
      )}
      <div className="dock">{dock()}</div>
      <p className="stage__rotate" role="alert">
        Gire o celular para a vertical.
      </p>
    </div>
  );
}
