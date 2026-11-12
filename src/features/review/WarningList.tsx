import { warningKey, warningText } from '../../app/copy';
import type { ScriptWarning } from '../../domain/types';
import { Button } from '../../ui/Button';

interface WarningListProps {
  warnings: readonly ScriptWarning[];
  /** Closes gaps and overlaps by making blocks contiguous. */
  onFixTimes(): void;
  onDismiss(key: string): void;
}

/** Script-level warnings. They inform and offer a fix; they never block rehearsing or recording. */
export function WarningList({ warnings, onFixTimes, onDismiss }: WarningListProps) {
  if (warnings.length === 0) return null;
  return (
    <ul className="warnings" aria-label="Avisos do roteiro">
      {warnings.map((warning) => {
        const key = warningKey(warning);
        return (
          <li key={key} className="notice notice--warn">
            <p>
              {warningText(warning)}
              {warning.kind === 'estimated' && (
                <span className="muted"> Calculei a 2,6 palavras/s. Toque no tempo de um bloco para ajustar.</span>
              )}
            </p>
            {warning.kind === 'gap' && (
              <div className="notice__actions">
                <Button size="sm" onClick={onFixTimes}>
                  Juntar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(key)}>
                  Manter como pausa
                </Button>
              </div>
            )}
            {warning.kind === 'overlap' && (
              <div className="notice__actions">
                <Button size="sm" onClick={onFixTimes}>
                  Ajustar automaticamente
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
