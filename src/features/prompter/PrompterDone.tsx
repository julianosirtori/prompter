import { useState } from 'react';
import { takeLabel } from '../../app/copy';
import { navigate } from '../../app/router';
import type { Take } from '../../domain/take';
import type { Script } from '../../domain/types';
import { Button } from '../../ui/Button';
import { RangePicker } from '../session/RangePicker';

interface PrompterDoneProps {
  script: Script;
  take: Take;
  onAgain(): void;
}

/** End of a prompter-only run: the video is in another camera, so there is nothing to review. */
export function PrompterDone({ script, take, onAgain }: PrompterDoneProps) {
  const [picking, setPicking] = useState(false);
  const lastBlock = take.marks.at(-1)?.blockIndex ?? take.range.from;

  return (
    <main className="screen summary">
      <p className="eyebrow">{takeLabel(take)}</p>
      <h1 className="display">Terminou. Pare a gravação na sua câmera.</h1>
      {take.incomplete && <p className="muted">Parado no bloco {lastBlock + 1}.</p>}
      <div className="summary__actions">
        <Button variant="primary" size="lg" onClick={onAgain}>
          De novo
        </Button>
        <Button size="lg" onClick={() => setPicking(true)}>
          Do bloco…
        </Button>
      </div>
      <div className="summary__actions">
        <Button variant="ghost" onClick={() => navigate({ name: 'review', scriptId: script.id }, { replace: true })}>
          Voltar ao roteiro
        </Button>
      </div>
      <RangePicker
        open={picking}
        blocks={script.blocks}
        initial={take.incomplete ? lastBlock : take.range.from}
        onClose={() => setPicking(false)}
        onPick={(range) => navigate({ name: 'session', scriptId: script.id, kind: 'record', range }, { replace: true })}
      />
    </main>
  );
}
