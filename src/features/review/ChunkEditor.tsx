import { words } from '../../domain/text';

interface ChunkEditorProps {
  chunks: readonly string[];
  blockNumber: number;
  onChange(chunks: string[]): void;
}

/** Shows how the speech is split; tapping between two words joins or splits the chunks there. */
export function ChunkEditor({ chunks, blockNumber, onChange }: ChunkEditorProps) {
  const groups = chunks.map((chunk) => words(chunk));
  const flat = groups.flat();
  /** Word positions after which a chunk ends. */
  const breaks = new Set<number>();
  let count = 0;
  for (const group of groups) {
    count += group.length;
    breaks.add(count);
  }

  const toggle = (position: number) => {
    const next = new Set(breaks);
    if (!next.delete(position)) next.add(position);
    const result: string[] = [];
    let current: string[] = [];
    flat.forEach((word, index) => {
      current.push(word);
      if (next.has(index + 1) || index === flat.length - 1) {
        result.push(current.join(' '));
        current = [];
      }
    });
    onChange(result);
  };

  return (
    <div className="chunks" role="group" aria-label={`Trechos do bloco ${blockNumber}. Toque entre as palavras para juntar ou separar.`}>
      {flat.map((word, index) => {
        const split = breaks.has(index + 1);
        return (
          <span key={`${index}-${word}`} className="chunks__pair">
            <span className="chunks__word">{word}</span>
            {index < flat.length - 1 && (
              <button
                type="button"
                className={`chunks__gap${split ? ' is-split' : ''}`}
                aria-pressed={split}
                aria-label={split ? `Juntar depois de “${word}”` : `Separar depois de “${word}”`}
                onClick={() => toggle(index + 1)}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
