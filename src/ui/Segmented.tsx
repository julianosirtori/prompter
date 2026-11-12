export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange(value: T): void;
  /** One option per row, for long labels. */
  stacked?: boolean;
}

/** Single-choice control rendered as a radio group of buttons. */
export function Segmented<T extends string>({ label, value, options, onChange, stacked = false }: SegmentedProps<T>) {
  return (
    <div className={`segmented${stacked ? ' segmented--stacked' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="segmented__option"
          onClick={() => onChange(option.value)}
        >
          <span>{option.label}</span>
          {option.hint && <small>{option.hint}</small>}
        </button>
      ))}
    </div>
  );
}
