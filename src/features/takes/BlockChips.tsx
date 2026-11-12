import { blockSpanLabel } from '../../app/copy';
import type { BlockMark } from '../../domain/timeline';
import type { Block } from '../../domain/types';

interface BlockChipsProps {
  blocks: readonly Block[];
  marks: readonly BlockMark[];
  activeBlock: number | null;
  /** Disabled when there is no video to seek. */
  canSeek: boolean;
  onSeek(mark: BlockMark): void;
}

/** The take's timeline as one chip per block; tapping a chip jumps the player to that block. */
export function BlockChips({ blocks, marks, activeBlock, canSeek, onSeek }: BlockChipsProps) {
  return (
    <ol className="chips" aria-label="Blocos do take">
      {marks.map((mark) => {
        const block = blocks[mark.blockIndex];
        const active = mark.blockIndex === activeBlock;
        return (
          <li key={mark.blockIndex}>
            <button
              type="button"
              className={`chip chip--block${active ? ' is-active' : ''}`}
              aria-current={active ? 'true' : undefined}
              disabled={!canSeek}
              onClick={() => onSeek(mark)}
            >
              <strong>{mark.blockIndex + 1}</strong>
              {block && <span>{blockSpanLabel(block)}</span>}
              {mark.interrupted && <span className="chip__flag">interrompido</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
