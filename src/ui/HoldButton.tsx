import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface HoldButtonProps {
  /** Fires once the button has been held for `holdMs`. */
  onHold(): void;
  holdMs?: number;
  label: string;
  children: ReactNode;
}

/** A button that only fires after being held, so a stray touch cannot end a take. */
export function HoldButton({ onHold, holdMs = 1000, label, children }: HoldButtonProps) {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const onHoldRef = useRef(onHold);
  useEffect(() => {
    onHoldRef.current = onHold;
  }, [onHold]);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  }, []);

  const begin = useCallback(() => {
    if (timer.current !== null) return;
    setPressing(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPressing(false);
      onHoldRef.current();
    }, holdMs);
  }, [holdMs]);

  useEffect(() => cancel, [cancel]);

  return (
    <button
      type="button"
      className={`hold${pressing ? ' is-pressing' : ''}`}
      style={{ '--hold-ms': `${holdMs}ms` } as CSSProperties}
      aria-label={label}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.repeat) begin();
      }}
      onKeyUp={cancel}
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="hold__fill" aria-hidden="true" />
      <span className="hold__label">{children}</span>
    </button>
  );
}
