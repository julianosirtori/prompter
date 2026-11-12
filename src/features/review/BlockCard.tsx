import { useState } from 'react';
import { capitalize, warningText } from '../../app/copy';
import { isSilent, type Block, type ScriptWarning } from '../../domain/types';
import { Button } from '../../ui/Button';
import { ConfirmInline } from '../../ui/ConfirmInline';
import { Icon } from '../../ui/Icon';
import { ChunkEditor } from './ChunkEditor';
import { DurationField } from './DurationField';

export interface BlockActions {
  onSpeech(text: string): void;
  onEdit(text: string): void;
  onChunks(chunks: string[]): void;
  onDuration(seconds: number): void;
  onDirectionOnly(): void;
  onInsertAfter(): void;
  onRemove(): void;
  onRerecord(): void;
}

interface BlockCardProps extends BlockActions {
  block: Block;
  index: number;
  tight: ScriptWarning | undefined;
  canRemove: boolean;
}

export function BlockCard({ block, index, tight, canRemove, ...actions }: BlockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const number = index + 1;
  const silent = isSilent(block);

  return (
    <li className={`block${silent ? ' block--silent' : ''}${tight ? ' block--tight' : ''}`}>
      <header className="block__head">
        <span className="block__num" aria-hidden="true">
          {number}
        </span>
        <DurationField block={block} blockNumber={number} onCommit={actions.onDuration} />
        {silent && <span className="tag tag--amber">bloco mudo</span>}
        <button
          type="button"
          className="icon-btn block__more"
          aria-label={`Ações do bloco ${number}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name="more" />
        </button>
      </header>

      {menuOpen && (
        <div className="block__menu">
          <Button size="sm" icon="redo" onClick={actions.onRerecord}>
            Regravar bloco {number}
          </Button>
          {!silent && (
            <Button size="sm" icon="action" onClick={actions.onDirectionOnly}>
              Só direção
            </Button>
          )}
          <Button size="sm" icon="plus" onClick={actions.onInsertAfter}>
            Inserir bloco depois
          </Button>
          {canRemove && (
            <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirming(true)}>
              Excluir
            </Button>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmInline
          question={`Excluir o bloco ${number}?`}
          confirmLabel="Excluir"
          onConfirm={actions.onRemove}
          onCancel={() => setConfirming(false)}
        />
      )}

      {block.directions.length > 0 && (
        <ul className="block__directions" aria-label="Direções de cena">
          {block.directions.map((direction, position) => (
            <li key={`${position}-${direction}`} className="chip chip--amber">
              <Icon name="action" size={14} />
              {capitalize(direction)}
            </li>
          ))}
        </ul>
      )}

      <textarea
        key={block.speech}
        className="block__speech"
        defaultValue={block.speech}
        rows={Math.max(1, Math.ceil(block.speech.length / 34))}
        aria-label={`Fala do bloco ${number}`}
        placeholder={silent ? 'Sem fala. Escreva aqui para o bloco deixar de ser mudo.' : 'Fala do bloco'}
        onBlur={(event) => {
          if (event.target.value.trim() !== block.speech) actions.onSpeech(event.target.value);
        }}
      />

      {tight && (
        <p className="block__tight" role="status">
          {warningText(tight)}
        </p>
      )}

      {block.chunks.length > 0 && <ChunkEditor chunks={block.chunks} blockNumber={number} onChange={actions.onChunks} />}

      <details className="block__note">
        <summary>
          <Icon name="chevron" size={14} />
          Nota de edição{block.edit ? '' : ' (vazia)'}
        </summary>
        <textarea
          key={block.edit}
          defaultValue={block.edit}
          rows={2}
          aria-label={`Nota de edição do bloco ${number}`}
          placeholder="O que entra na edição deste bloco"
          onBlur={(event) => {
            if (event.target.value.trim() !== block.edit) actions.onEdit(event.target.value.trim());
          }}
        />
        {block.extra.length > 0 && (
          <p className="block__extra">
            <span className="eyebrow">Outras colunas</span> {block.extra.join(' · ')}
          </p>
        )}
      </details>
    </li>
  );
}
