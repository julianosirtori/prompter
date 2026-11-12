import { useState } from 'react';
import { scriptSummary } from '../../app/copy';
import type { Script } from '../../domain/types';
import { ConfirmInline } from '../../ui/ConfirmInline';
import { Icon } from '../../ui/Icon';

interface RecentScriptsProps {
  scripts: readonly Script[];
  onOpen(scriptId: string): void;
  onDelete(scriptId: string): void;
}

const dayLabel = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

export function RecentScripts({ scripts, onOpen, onDelete }: RecentScriptsProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  if (scripts.length === 0) return null;

  return (
    <section className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="eyebrow">
        Roteiros recentes
      </h2>
      <ul className="recent__list">
        {scripts.map((script) => (
          <li key={script.id} className="recent__item">
            <div className="recent__row">
              <button type="button" className="recent__open" onClick={() => onOpen(script.id)}>
                <span className="recent__title">{script.title}</span>
                <span className="recent__meta">
                  {scriptSummary(script)} · {dayLabel(script.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Apagar roteiro ${script.title}`}
                onClick={() => setConfirming(script.id)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
            {confirming === script.id && (
              <ConfirmInline
                question="Apagar este roteiro e os takes dele? Não dá pra desfazer."
                confirmLabel="Apagar"
                onConfirm={() => {
                  setConfirming(null);
                  onDelete(script.id);
                }}
                onCancel={() => setConfirming(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
