import { useState } from 'react';
import { takeLabel } from '../../app/copy';
import { goBack, navigate } from '../../app/router';
import { sameRange } from '../../app/sessionAdapters';
import type { Take } from '../../domain/take';
import type { BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import { Button } from '../../ui/Button';
import { useHotkeys } from '../../ui/useHotkeys';
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

  /** The same blocks as this run are just another attempt: the address does not change. */
  const recordRange = (range: BlockRange) => {
    if (sameRange(range, take.range)) onAgain();
    else navigate({ name: 'session', scriptId: script.id, kind: 'record', range }, { replace: true });
  };

  // R: record again the block that was on screen when the run stopped.
  useHotkeys({ r: () => recordRange({ from: lastBlock, to: lastBlock }) });

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
        <Button size="lg" shortcut="R" className="only-desktop" onClick={() => recordRange({ from: lastBlock, to: lastBlock })}>
          Regravar bloco {lastBlock + 1}
        </Button>
      </div>
      <div className="summary__actions">
        <Button variant="ghost" onClick={() => goBack({ name: 'review', scriptId: script.id })}>
          Voltar ao roteiro
        </Button>
      </div>
      <RangePicker
        open={picking}
        blocks={script.blocks}
        initial={take.incomplete ? lastBlock : take.range.from}
        onClose={() => setPicking(false)}
        onPick={(range) => {
          setPicking(false);
          recordRange(range);
        }}
      />
    </main>
  );
}
