import { preciseSeconds, takeVerdict } from '../../app/copy';
import { blockPaces } from '../../domain/take';
import type { BlockMark } from '../../domain/timeline';
import type { Block } from '../../domain/types';
import { Button } from '../../ui/Button';

interface PaceListProps {
  blocks: readonly Block[];
  marks: readonly BlockMark[];
  /** Replaces the block's scripted time with the time measured in this take. */
  onUseTime(blockIndex: number, seconds: number): void;
}

/** Pace per block: real time in the take against the script, off-pace blocks in amber. */
export function PaceList({ blocks, marks, onUseTime }: PaceListProps) {
  const paces = new Map(blockPaces(blocks, marks).map((pace) => [pace.blockIndex, pace]));
  if (marks.length === 0) return null;

  return (
    <section aria-labelledby="pace-title">
      <h2 id="pace-title" className="eyebrow">
        Ritmo por bloco
      </h2>
      <ul className="pace-list">
        {marks.map((mark) => {
          const pace = paces.get(mark.blockIndex);
          const number = mark.blockIndex + 1;
          if (!pace) {
            return (
              <li key={mark.blockIndex} className="pace-item is-interrupted">
                <p>
                  <strong>Bloco {number}</strong> · interrompido
                </p>
              </li>
            );
          }
          return (
            <li key={mark.blockIndex} className={`pace-item${pace.offPace ? ' is-off' : ''}`}>
              <p>
                <strong>Bloco {number}</strong> · {preciseSeconds(pace.scripted)} no roteiro · {takeVerdict(pace)}
              </p>
              {pace.offPace && (
                <div className="pace-item__fix">
                  <Button size="sm" onClick={() => onUseTime(mark.blockIndex, Math.round(pace.actual * 10) / 10)}>
                    Use meus tempos neste bloco
                  </Button>
                  {pace.difference > 0 && <span className="muted">ou corte texto do bloco {number}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
