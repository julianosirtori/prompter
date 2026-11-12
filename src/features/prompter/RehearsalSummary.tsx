import { preciseSeconds, rehearsalVerdict } from '../../app/copy';
import { reviewFlashKey, setFlash } from '../../app/flash';
import { goBack, navigate } from '../../app/router';
import { measuredDurations, spokenMarks } from '../../app/sessionAdapters';
import { applyDurations, totalDuration } from '../../domain/script';
import { blockPaces } from '../../domain/take';
import { formatSeconds } from '../../domain/time';
import type { BlockMark, BlockRange } from '../../domain/timeline';
import type { Script } from '../../domain/types';
import { Button } from '../../ui/Button';

interface RehearsalSummaryProps {
  script: Script;
  range: BlockRange;
  marks: readonly BlockMark[];
  /** Manual advance: the times are the speaker's own rhythm. */
  measured: boolean;
  incomplete: boolean;
  onAgain(): void;
  onSaveScript(script: Script): void;
}

/** End of a rehearsal: "Seu tempo × roteiro" per block and what to do with it. */
export function RehearsalSummary({ script, range, marks, measured, incomplete, onAgain, onSaveScript }: RehearsalSummaryProps) {
  // Blocks that were only passed through (skipped with 1–9) are not a measure of anything.
  const paces = blockPaces(script.blocks, spokenMarks(marks));
  const coveredAll = !incomplete && paces.length === range.to - range.from + 1;
  const canUseTimes = coveredAll && (measured || paces.some((pace) => pace.offPace));
  const stoppedAt = marks.find((mark) => mark.interrupted) ?? marks.at(-1);
  const toReview = () => goBack({ name: 'review', scriptId: script.id });

  const useMyTimes = () => {
    const next = applyDurations(script, measuredDurations(script.blocks, paces));
    onSaveScript(next);
    setFlash(
      reviewFlashKey(script.id),
      `Tempos atualizados. A duração total mudou de ${formatSeconds(totalDuration(script))} para ${formatSeconds(totalDuration(next))}.`,
    );
    toReview();
  };

  return (
    <main className="screen summary">
      <p className="eyebrow">Ensaio</p>
      <h1 className="display">
        {incomplete && stoppedAt ? `Ensaio parado no bloco ${stoppedAt.blockIndex + 1}.` : 'Ensaio feito. Bora gravar?'}
      </h1>

      {paces.length > 0 && (
        <section aria-labelledby="pace-title">
          <h2 id="pace-title" className="eyebrow">
            Seu tempo × roteiro
          </h2>
          <table className="pace-table">
            <thead>
              <tr>
                <th scope="col">Bloco</th>
                <th scope="col">Você</th>
                <th scope="col">Roteiro</th>
                <th scope="col">
                  <span className="sr-only">Comparação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paces.map((pace) => (
                <tr key={pace.blockIndex} className={pace.offPace ? 'is-off' : undefined}>
                  <th scope="row">Bloco {pace.blockIndex + 1}</th>
                  <td>{preciseSeconds(pace.actual)}</td>
                  <td>{formatSeconds(pace.scripted)}</td>
                  <td>{rehearsalVerdict(pace)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!measured && <p className="muted">No avanço manual o app mede o seu ritmo em cada bloco.</p>}
        </section>
      )}

      <div className="summary__actions">
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate({ name: 'session', scriptId: script.id, kind: 'record', range: null }, { replace: true })}
        >
          Gravar
        </Button>
        <Button size="lg" onClick={onAgain}>
          Ensaiar de novo
        </Button>
      </div>
      <div className="summary__actions">
        {canUseTimes && (
          <Button onClick={useMyTimes}>Usar meus tempos</Button>
        )}
        <Button variant="ghost" onClick={toReview}>
          Manter o roteiro
        </Button>
      </div>
      {canUseTimes && <p className="muted">“Usar meus tempos” troca o tempo de cada bloco pelo que você mediu. A duração total muda.</p>}
    </main>
  );
}
