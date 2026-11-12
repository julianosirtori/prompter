import { useState } from 'react';
import { blockTimeLabel } from '../../app/copy';
import { blockDuration, type Block } from '../../domain/types';

interface DurationFieldProps {
  block: Block;
  blockNumber: number;
  onCommit(seconds: number): void;
}

/** "0–3s · 3s" label that turns into a duration input when tapped. */
export function DurationField({ block, blockNumber, onCommit }: DurationFieldProps) {
  const [editing, setEditing] = useState(false);
  const label = blockTimeLabel(block);

  if (!editing) {
    return (
      <button
        type="button"
        className="block__time"
        aria-label={`Bloco ${blockNumber}, ${label}. Editar tempo`}
        onClick={() => setEditing(true)}
      >
        {label}
      </button>
    );
  }

  const commit = (raw: string) => {
    const seconds = Number(raw.replace(',', '.'));
    if (Number.isFinite(seconds) && seconds > 0 && seconds !== blockDuration(block)) onCommit(seconds);
    setEditing(false);
  };

  return (
    <label className="block__time-edit">
      <span>Duração</span>
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        defaultValue={String(blockDuration(block)).replace('.', ',')}
        onFocus={(event) => event.target.select()}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setEditing(false);
        }}
      />
      <span>s</span>
    </label>
  );
}
