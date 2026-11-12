import { onRadioGroupKeyDown, radioTabIndex } from '../../ui/radioGroup';

interface RatingProps {
  value: number | undefined;
  onChange(value: number): void;
}

const POINTS = [1, 2, 3, 4, 5] as const;

/** Optional self-assessment, from 1 (reading) to 5 (conversation). */
export function Rating({ value, onChange }: RatingProps) {
  return (
    <section aria-labelledby="rating-title">
      <h2 id="rating-title" className="eyebrow">
        Pareceu conversa ou leitura?
      </h2>
      <div className="rating" role="radiogroup" aria-labelledby="rating-title" onKeyDown={onRadioGroupKeyDown}>
        <span className="muted" aria-hidden="true">
          leitura
        </span>
        {POINTS.map((point) => (
          <button
            key={point}
            type="button"
            role="radio"
            aria-checked={value === point}
            tabIndex={radioTabIndex(value === point, point === 1, value !== undefined)}
            aria-label={`${point} de 5${point === 1 ? ', leitura' : point === 5 ? ', conversa' : ''}`}
            className="rating__point"
            onClick={() => onChange(point)}
          >
            {point}
          </button>
        ))}
        <span className="muted" aria-hidden="true">
          conversa
        </span>
      </div>
    </section>
  );
}
