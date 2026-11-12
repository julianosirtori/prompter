import { takeLabel } from '../../app/copy';
import type { Take } from '../../domain/take';
import { Icon } from '../../ui/Icon';

interface TakeListProps {
  takes: readonly Take[];
  currentId: string;
  onOpen(takeId: string): void;
}

export function TakeList({ takes, currentId, onOpen }: TakeListProps) {
  return (
    <section aria-labelledby="takes-title">
      <h2 id="takes-title" className="eyebrow">
        Takes deste roteiro
      </h2>
      <ul className="take-list">
        {takes.map((take) => (
          <li key={take.id}>
            <button
              type="button"
              className="take-item"
              aria-current={take.id === currentId ? 'true' : undefined}
              onClick={() => onOpen(take.id)}
            >
              <span>{takeLabel(take)}</span>
              {take.kind === 'prompter' && <span className="tag">só prompter</span>}
              {take.incomplete && <span className="tag tag--amber">incompleto</span>}
              {take.starred && (
                <span className="take-item__star" role="img" aria-label="Ficou bom">
                  <Icon name="star" size={16} filled />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
