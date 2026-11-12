import type { ReactNode } from 'react';
import { clockLabel } from '../../app/copy';
import type { AdvanceMode, Prompter } from '../../engine/prompter';
import { isIOS, isStandalone, toggleFullscreen } from '../../media/device';
import { Button } from '../../ui/Button';
import { HoldButton } from '../../ui/HoldButton';
import { CAMERA_PERMISSION_TEXT, cameraErrorText } from './cameraCopy';
import type { SessionMode } from './sessionMode';
import type { CameraState } from './useCamera';
import { usePrompterSnapshot } from './usePrompterValue';

/** What the dock has to show, decided by the session. */
export type DockView =
  | { kind: 'none' }
  | { kind: 'failed' }
  | { kind: 'quota' }
  | { kind: 'camera'; state: Extract<CameraState, { status: 'explain' | 'error' }> }
  | { kind: 'ready'; canStart: boolean }
  | { kind: 'live' };

export interface DockActions {
  onStart(): void;
  onStop(): void;
  onExit(): void;
  onRestart(): void;
  onPromptOnly(): void;
  onOpenCamera(): void;
  onTakes(): void;
}

interface SessionDockProps {
  view: DockView;
  mode: SessionMode;
  advance: AdvanceMode;
  prompter: Prompter;
  actions: DockActions;
}

/** Bottom of the stage: the status of the take and the few decisions each state asks for. */
export function SessionDock({ view, mode, advance, prompter, actions }: SessionDockProps) {
  return <div className="dock">{dockContent(view, mode, advance, prompter, actions)}</div>;
}

const dockContent = (view: DockView, mode: SessionMode, advance: AdvanceMode, prompter: Prompter, actions: DockActions): ReactNode => {
  switch (view.kind) {
    case 'none':
      return null;
    case 'failed':
      return (
        <DockMessage text="A gravação falhou. Tente de novo ou use só como prompter.">
          <Button variant="primary" onClick={actions.onRestart}>
            Tentar de novo
          </Button>
          <Button onClick={actions.onPromptOnly}>Só prompter</Button>
          <Button variant="ghost" onClick={actions.onTakes}>
            Ver takes
          </Button>
        </DockMessage>
      );
    case 'quota':
      return (
        <DockMessage text="Sem espaço para guardar o take. Baixe ou apague takes antigos.">
          <Button variant="primary" onClick={actions.onTakes}>
            Ver takes
          </Button>
        </DockMessage>
      );
    case 'camera':
      return <CameraMessage state={view.state} actions={actions} />;
    case 'ready':
      return <ReadyPanel mode={mode} advance={advance} canStart={view.canStart} onStart={actions.onStart} onExit={actions.onExit} />;
    case 'live':
      return <LivePanel mode={mode} prompter={prompter} onStop={actions.onStop} />;
  }
};

/** A state of the screen that needs words and a decision (permission, errors). */
function DockMessage({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="dock__message" role="alert">
      <p>{text}</p>
      {children && <div className="dock__actions">{children}</div>}
    </div>
  );
}

function CameraMessage({ state, actions }: { state: Extract<CameraState, { status: 'explain' | 'error' }>; actions: DockActions }) {
  if (state.status === 'explain') {
    return (
      <DockMessage text={CAMERA_PERMISSION_TEXT}>
        <Button variant="primary" onClick={actions.onOpenCamera}>
          Permitir
        </Button>
        <Button onClick={actions.onPromptOnly}>Usar só como prompter</Button>
        <Button variant="ghost" onClick={actions.onExit}>
          Voltar
        </Button>
      </DockMessage>
    );
  }
  return (
    <DockMessage text={cameraErrorText(state.kind)}>
      <Button variant="primary" onClick={actions.onPromptOnly}>
        Usar só como prompter
      </Button>
      {state.kind !== 'unsupported' && <Button onClick={actions.onOpenCamera}>Tentar de novo</Button>}
      <Button variant="ghost" onClick={actions.onExit}>
        Voltar
      </Button>
    </DockMessage>
  );
}

const READY_TEXT: Record<SessionMode, string> = {
  camera: 'Olhe para a câmera. Seus olhos devem ficar na altura do texto.',
  prompter: 'Aperte gravar na sua câmera antes de começar.',
  rehearsal: 'Ensaio: nada é gravado.',
};

interface ReadyPanelProps {
  mode: SessionMode;
  advance: AdvanceMode;
  canStart: boolean;
  onStart(): void;
  onExit(): void;
}

function ReadyPanel({ mode, advance, canStart, onStart, onExit }: ReadyPanelProps) {
  const suggestInstall = isIOS() && !isStandalone();
  return (
    <div className="dock__ready">
      <p className="dock__lead">{READY_TEXT[mode]}</p>
      {mode === 'rehearsal' && (
        <p className="dock__tip">
          {advance === 'manual'
            ? 'Toque na tela ou aperte Espaço a cada trecho: o app mede o seu ritmo.'
            : 'O texto avança no tempo do roteiro. Toque para adiantar, segure para pausar.'}
        </p>
      )}
      <div className="dock__actions">
        <Button variant="primary" size="lg" disabled={!canStart} onClick={onStart}>
          Começar
        </Button>
        <Button variant="ghost" size="lg" onClick={onExit}>
          Voltar
        </Button>
        <Button variant="ghost" size="lg" icon="fullscreen" className="only-desktop" aria-label="Tela cheia (F)" onClick={() => void toggleFullscreen()} />
      </div>
      <p className="dock__tip only-desktop">
        Deixe esta janela no topo da tela, embaixo da webcam. Diminua o zoom do navegador se o texto ficar longe da câmera.
        Espaço ou Enter começa.
      </p>
      {suggestInstall && <p className="dock__tip only-touch">Para tela cheia, adicione à Tela de Início.</p>}
    </div>
  );
}

/** Follows the engine every frame (clock, take bar), so it subscribes on its own. */
function LivePanel({ mode, prompter, onStop }: { mode: SessionMode; prompter: Prompter; onStop(): void }) {
  const { elapsed, blockNumber, blockCount, blockProgress, phase } = usePrompterSnapshot(prompter);
  const takeProgress = phase === 'running' ? (blockNumber - 1 + blockProgress) / blockCount : phase === 'tail' ? 1 : 0;
  return (
    <div className="dock__live">
      <p className="dock__status">
        {mode === 'camera' && (
          <span className="rec">
            <span className="rec__dot" aria-hidden="true" />
            REC
          </span>
        )}
        {mode === 'rehearsal' && <span className="dock__mode">ENSAIO</span>}
        <span>{clockLabel(elapsed)}</span>
        <span aria-hidden="true">·</span>
        <span>
          bloco {blockNumber}/{blockCount}
        </span>
      </p>
      <HoldButton label="Parar. Segure por 1 segundo" onHold={onStop}>
        <span className="hold__square" aria-hidden="true" />
        Parar
      </HoldButton>
      <p className="dock__hint only-touch">Segure para parar</p>
      <p className="dock__hint only-desktop">Esc para parar · Espaço avança · ← volta · F tela cheia</p>
      <div className="dock__take-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${takeProgress})` }} />
      </div>
    </div>
  );
}
