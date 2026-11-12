import { capitalize } from '../../app/copy';
import { formatSeconds } from '../../domain/time';
import type { Block } from '../../domain/types';
import type { Prompter, PrompterSnapshot } from '../../engine/prompter';
import { Icon } from '../../ui/Icon';
import { usePrompterSnapshot } from './usePrompterValue';

interface StripProps {
  prompter: Prompter;
  /** Last chunk of the previous block, shown greyed when re-recording a block. */
  context: string | null;
  /** Replaces the text while the camera opens or the take is saved. */
  status: string | null;
  mirror: boolean;
  /** Passed only while rehearsing: the edit note of the block on screen shows under the strip. */
  editNotesOf: readonly Block[] | null;
}

/** The band next to the lens: current chunk, next chunk and the block bar. Nothing else. */
export function Strip({ prompter, context, status, mirror, editNotesOf }: StripProps) {
  return (
    <div className={`strip${mirror ? ' is-mirrored' : ''}`}>
      <div className="strip__inner">
        {status ? <StripStatus text={status} /> : <LiveText prompter={prompter} context={context} editNotesOf={editNotesOf} />}
      </div>
    </div>
  );
}

/** The only part of the screen that follows the engine frame by frame. */
function LiveText({ prompter, context, editNotesOf }: Pick<StripProps, 'prompter' | 'context' | 'editNotesOf'>) {
  const snapshot = usePrompterSnapshot(prompter);
  const block = snapshot.current ? editNotesOf?.[snapshot.current.blockIndex] : undefined;
  return <StripText snapshot={snapshot} context={context} editNote={block?.edit || null} />;
}

function StripStatus({ text }: { text: string }) {
  return (
    <p className="strip__status" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </p>
  );
}

function Context({ text }: { text: string }) {
  return (
    <p className="strip__context">
      <span className="strip__context-label">Antes: (não fale)</span>
      …{text}
    </p>
  );
}

function StripText({ snapshot, context, editNote }: { snapshot: PrompterSnapshot; context: string | null; editNote: string | null }) {
  const { phase, current, next, holding, blockProgress, countdown } = snapshot;

  if (phase === 'countdown') {
    return (
      <>
        {context && <Context text={context} />}
        <p key={countdown} className="strip__count" role="timer" aria-label={`Começa em ${countdown}`}>
          {countdown}
        </p>
      </>
    );
  }

  // End of the take: the text goes away and only an anchor for the eyes stays near the lens.
  if (phase === 'tail' || phase === 'finished' || !current) return <span className="strip__gaze" aria-hidden="true" />;

  const running = phase === 'running';
  const remaining = Math.max(1, Math.ceil(current.duration * (1 - blockProgress)));
  // In a silent block the next line only shows up near the end, as the cue to speak again.
  const showNext = next !== null && (!current.silent || !running || blockProgress > 0.6);

  return (
    <>
      {context && phase === 'ready' && <Context text={context} />}
      {current.silent ? (
        <p className="strip__direction">
          <Icon name="action" size={22} />
          <span>
            {capitalize(current.text)} · {running ? `${remaining}s` : formatSeconds(current.duration)}
          </span>
        </p>
      ) : (
        <>
          {current.directions.length > 0 && (
            <p className="strip__tag">
              <Icon name="action" size={14} />
              {current.directions.join(' · ')}
            </p>
          )}
          <p className="strip__current">{current.text}</p>
        </>
      )}
      {holding && (
        <p className="strip__holding" role="status">
          <Icon name="pause" size={14} />
          Segurando
        </p>
      )}
      {showNext && <p className={`strip__next${next.silent ? ' is-direction' : ''}`}>{next.silent ? capitalize(next.text) : next.text}</p>}
      {running && (
        <div className="strip__bar" aria-hidden="true">
          <span key={current.blockIndex} className="strip__pulse" />
          <span className="strip__bar-fill" style={{ transform: `scaleX(${blockProgress})` }} />
        </div>
      )}
      {editNote && <p className="strip__note">Edição: {editNote}</p>}
    </>
  );
}
