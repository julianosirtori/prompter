import { Button } from './Button';

interface ConfirmInlineProps {
  question: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

/** In-page confirmation for destructive actions (never window.confirm). */
export function ConfirmInline({ question, confirmLabel, onConfirm, onCancel }: ConfirmInlineProps) {
  return (
    <div className="confirm" role="alertdialog" aria-label={question}>
      <p>{question}</p>
      <div className="confirm__actions">
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="sm" autoFocus onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
