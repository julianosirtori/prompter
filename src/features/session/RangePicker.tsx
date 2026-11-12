import { useState } from 'react';
import { blockSpanLabel, rerecordLabel } from '../../app/copy';
import type { BlockRange } from '../../domain/timeline';
import type { Block } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';

interface RangePickerProps {
  open: boolean;
  blocks: readonly Block[];
  /** Block selected when the sheet opens. */
  initial: number;
  onPick(range: BlockRange): void;
  onClose(): void;
}

/** Picks one block or a contiguous run of blocks to record again. */
export function RangePicker({ open, blocks, initial, onPick, onClose }: RangePickerProps) {
  return (
    <Sheet open={open} title="Regravar bloco…" onClose={onClose}>
      <RangeChoices blocks={blocks} initial={initial} onPick={onPick} />
    </Sheet>
  );
}

function RangeChoices({ blocks, initial, onPick }: Pick<RangePickerProps, 'blocks' | 'initial' | 'onPick'>) {
  const start = Math.min(Math.max(0, initial), Math.max(0, blocks.length - 1));
  const [range, setRange] = useState<BlockRange>({ from: start, to: start });

  /** Tapping outside the selection extends it to that block; tapping inside restarts there. */
  const choose = (index: number) =>
    setRange((current) => {
      if (index < current.from) return { from: index, to: current.to };
      if (index > current.to) return { from: current.from, to: index };
      return { from: index, to: index };
    });

  return (
    <>
      <p className="muted">Toque num bloco. Toque em outro para pegar o intervalo entre eles.</p>
      <ul className="range-list">
        {blocks.map((block, index) => {
          const selected = index >= range.from && index <= range.to;
          return (
            <li key={block.id}>
              <button type="button" className="range-item" aria-pressed={selected} onClick={() => choose(index)}>
                <span className="range-item__num">{index + 1}</span>
                <span className="range-item__text">{block.speech || block.directions.join(' · ') || 'Bloco mudo'}</span>
                <span className="range-item__time">{blockSpanLabel(block)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="sheet__sticky">
        <Button variant="primary" size="lg" block onClick={() => onPick(range)}>
          {rerecordLabel(range)}
        </Button>
      </div>
    </>
  );
}
