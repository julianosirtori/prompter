import { Icon } from './Icon';

interface FlashProps {
  text: string | null;
  onDismiss(): void;
}

/** Transient confirmation ("Take 2 salvo · 30,8s"). */
export function Flash({ text, onDismiss }: FlashProps) {
  if (!text) return null;
  return (
    <div className="flash" role="status">
      <span>{text}</span>
      <button type="button" className="icon-btn icon-btn--sm" aria-label="Dispensar aviso" onClick={onDismiss}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
