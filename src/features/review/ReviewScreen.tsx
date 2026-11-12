import { useMemo, useState } from 'react';
import { paceSummary, scriptSummary, warningKey } from '../../app/copy';
import { reviewFlashKey, useFlash } from '../../app/flash';
import { navigate, type SessionKind } from '../../app/router';
import type { UpdateSettings } from '../../app/useSettings';
import { useTakes } from '../../app/useTakes';
import {
  insertBlockAfter,
  makeContiguous,
  markDirectionOnly,
  removeBlock,
  renameScript,
  setBlockChunks,
  setBlockDuration,
  setBlockEdit,
  setBlockSpeech,
} from '../../domain/script';
import type { BlockRange } from '../../domain/timeline';
import type { Script, ScriptWarning } from '../../domain/types';
import { validateScript } from '../../domain/validate';
import type { Settings } from '../../storage/local';
import { Button } from '../../ui/Button';
import { Flash } from '../../ui/Flash';
import { Icon } from '../../ui/Icon';
import { useHotkeys } from '../../ui/useHotkeys';
import { SessionSheet } from '../session/SessionSheet';
import { BlockCard } from './BlockCard';
import { WarningList } from './WarningList';
import './review.css';

interface ReviewScreenProps {
  script: Script;
  settings: Settings;
  onSettings: UpdateSettings;
  /** Persists the edited script; edits are saved as they happen. */
  onChange(script: Script): void;
}

interface PendingSession {
  kind: SessionKind;
  range: BlockRange | null;
}

export function ReviewScreen({ script, settings, onSettings, onChange }: ReviewScreenProps) {
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [flash, dismissFlash] = useFlash(reviewFlashKey(script.id));
  const { takes } = useTakes(script.id);

  const warnings = useMemo(() => validateScript(script), [script]);
  const tightByBlock = new Map<number, ScriptWarning>();
  for (const warning of warnings) if (warning.kind === 'tight') tightByBlock.set(warning.block, warning);
  const scriptWarnings = warnings.filter((warning) => warning.kind !== 'tight' && !dismissed.has(warningKey(warning)));
  const pace = paceSummary(script.blocks);

  useHotkeys({
    e: () => setPending({ kind: 'rehearsal', range: null }),
    g: () => setPending({ kind: 'record', range: null }),
  });

  return (
    <div className="screen review">
      <header className="review__head">
        <button type="button" className="icon-btn" aria-label="Voltar para o início" onClick={() => navigate({ name: 'home' })}>
          <Icon name="back" />
        </button>
        <div className="review__heading">
          <input
            key={script.title}
            className="review__title"
            defaultValue={script.title}
            aria-label="Título do roteiro"
            onBlur={(event) => {
              const title = event.target.value.trim();
              if (title && title !== script.title) onChange(renameScript(script, title));
              else event.target.value = script.title;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <p className="review__summary">
            <strong>{scriptSummary(script)}</strong>
            {pace && <span className={`pace pace--${pace.label}`}>{pace.text}</span>}
          </p>
        </div>
        {takes.length > 0 && (
          <Button size="sm" icon="takes" onClick={() => navigate({ name: 'takes', scriptId: script.id, takeId: null })}>
            Takes · {takes.length}
          </Button>
        )}
      </header>

      <main className="review__main">
        <Flash text={flash} onDismiss={dismissFlash} />
        <WarningList
          warnings={scriptWarnings}
          onFixTimes={() => onChange(makeContiguous(script))}
          onDismiss={(key) => setDismissed((current) => new Set(current).add(key))}
        />

        <ol className="review__blocks">
          {script.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              tight={tightByBlock.get(index)}
              canRemove={script.blocks.length > 1}
              onSpeech={(text) => onChange(setBlockSpeech(script, block.id, text))}
              onEdit={(text) => onChange(setBlockEdit(script, block.id, text))}
              onChunks={(chunks) => onChange(setBlockChunks(script, block.id, chunks))}
              onDuration={(seconds) => onChange(setBlockDuration(script, block.id, seconds))}
              onDirectionOnly={() => onChange(markDirectionOnly(script, block.id))}
              onInsertAfter={() => onChange(insertBlockAfter(script, block.id))}
              onRemove={() => onChange(removeBlock(script, block.id))}
              onRerecord={() => setPending({ kind: 'record', range: { from: index, to: index } })}
            />
          ))}
        </ol>

        {takes.length === 0 && (
          <p className="review__tip muted">Faça um ensaio antes. O primeiro take quase sempre é aquecimento.</p>
        )}
        <p className="review__saved muted">Edições são salvas automaticamente neste aparelho.</p>
      </main>

      <footer className="review__foot">
        <div className="review__foot-inner">
          <Button size="lg" block shortcut="E" onClick={() => setPending({ kind: 'rehearsal', range: null })}>
            Ensaiar
          </Button>
          <Button variant="primary" size="lg" block shortcut="G" onClick={() => setPending({ kind: 'record', range: null })}>
            Gravar
          </Button>
        </div>
      </footer>

      <SessionSheet
        open={pending !== null}
        kind={pending?.kind ?? 'record'}
        range={pending?.range ?? null}
        settings={settings}
        onSettings={onSettings}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) navigate({ name: 'session', scriptId: script.id, ...pending });
        }}
      />
    </div>
  );
}
