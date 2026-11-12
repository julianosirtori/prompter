import { capitalize } from '../../app/copy';
import { formatSeconds } from '../../domain/time';
import type { PrompterSnapshot } from '../../engine/prompter';
import { Icon } from '../../ui/Icon';

interface StripProps {
  snapshot: PrompterSnapshot;
  /** Last chunk of the previous block, shown greyed when re-recording a block. */
  context: string | null;
  /** Replaces the text while the camera opens or the take is saved. */
  status: string | null;
  mirror: boolean;
  /** Edit note of the current block; only passed while rehearsing. */
  editNote: string | null;
}

/** The band next to the lens: current chunk, next chunk and the block bar. Nothing else. */
export function Strip({ snapshot, context, status, mirror, editNote }: StripProps) {
  return (
    <div className={`strip${mirror ? ' is-mirrored' : ''}`}>
      <div className="strip__inner">{status ? <StripStatus text={status} /> : <StripText snapshot={snapshot} context={context} editNote={editNote} />}</div>
    </div>
  );
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

function StripText({ snapshot, context, editNote }: Pick<StripProps, 'snapshot' | 'context' | 'editNote'>) {
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
