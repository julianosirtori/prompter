import type { ReactNode } from 'react';
import { clockLabel } from '../../app/copy';
import type { AdvanceMode, PrompterSnapshot } from '../../engine/prompter';
import { isIOS, isStandalone, toggleFullscreen } from '../../media/device';
import { Button } from '../../ui/Button';
import { HoldButton } from '../../ui/HoldButton';
import type { SessionMode } from './sessionMode';

/** A state of the screen that needs words and a decision (permission, errors). */
export function DockMessage({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="dock__message" role="alert">
      <p>{text}</p>
      {children && <div className="dock__actions">{children}</div>}
    </div>
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

export function ReadyPanel({ mode, advance, canStart, onStart, onExit }: ReadyPanelProps) {
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

interface LivePanelProps {
  mode: SessionMode;
  snapshot: PrompterSnapshot;
  onStop(): void;
}

export function LivePanel({ mode, snapshot, onStop }: LivePanelProps) {
  const { elapsed, blockNumber, blockCount, blockProgress, phase } = snapshot;
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
