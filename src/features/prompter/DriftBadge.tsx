import { signedSeconds } from '../../app/copy';
import type { Prompter } from '../../engine/prompter';
import { usePrompterValue } from './usePrompterValue';

/** "+1,2s" behind the script or "−0,8s" ahead; hidden while on time. Timed mode only. */
export function DriftBadge({ prompter }: { prompter: Prompter }) {
  const label = usePrompterValue(prompter, ({ phase, drift }) =>
    phase === 'running' && Math.abs(drift) >= 0.1 ? signedSeconds(drift) : null,
  );
  if (!label) return null;
  return (
    <span className="stage__drift" aria-label="Desvio em relação ao roteiro">
      {label}
    </span>
  );
}
