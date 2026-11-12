import { goBack, navigate } from '../../app/router';
import { useTakes } from '../../app/useTakes';
import type { Script } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TakeDetail } from './TakeDetail';
import { TakeList } from './TakeList';
import './takes.css';

interface TakeScreenProps {
  script: Script;
  /** Null opens the most recent take. */
  takeId: string | null;
  onSaveScript(script: Script): void;
}

export function TakeScreen({ script, takeId, onSaveScript }: TakeScreenProps) {
  const { takes, loading, error, update, remove, removing } = useTakes(script.id);
  const take = takes.find((candidate) => candidate.id === takeId) ?? takes.at(-1);
  const open = (id: string | null) => navigate({ name: 'takes', scriptId: script.id, takeId: id }, { replace: true });

  return (
    <div className="screen screen--wide takes">
      <header className="takes__head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Voltar para o roteiro"
          onClick={() => goBack({ name: 'review', scriptId: script.id })}
        >
          <Icon name="back" />
        </button>
        <p className="takes__script">{script.title}</p>
      </header>

      <main>
        {loading && <p className="muted">Abrindo takes…</p>}
        {error && (
          <p className="notice notice--warn" role="alert">
            {error}
          </p>
        )}

        {!loading && !take && (
          <div className="takes__empty">
            <h1 className="title">Nenhum take ainda</h1>
            <p className="muted">Grave o roteiro e o take aparece aqui para você rever.</p>
            <Button variant="primary" size="lg" onClick={() => navigate({ name: 'session', scriptId: script.id, kind: 'record', range: null })}>
              Gravar
            </Button>
          </div>
        )}

        {take && (
          <>
            <TakeDetail
              key={take.id}
              script={script}
              take={take}
              onUpdate={update}
              deleting={removing === take.id}
              onDelete={() =>
                void remove(take.id).then((removed) => {
                  if (removed) open(null);
                })
              }
              onSaveScript={onSaveScript}
            />
            <TakeList takes={takes} currentId={take.id} onOpen={open} />
            <p className="notice">Baixe os takes bons. O navegador pode limpar vídeos guardados aqui.</p>
          </>
        )}
      </main>
    </div>
  );
}
