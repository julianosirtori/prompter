import type { KeyboardEvent } from 'react';

const STEP: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Arrow-key behaviour of a radio group built from buttons with role="radio": arrows move to
 * the neighbour (wrapping), Home/End to the ends, and moving selects, like native radios.
 * Pair it with `radioTabIndex` so the group is a single tab stop.
 */
export const onRadioGroupKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')];
  const index = radios.findIndex((radio) => radio === document.activeElement);
  if (index === -1) return;
  let next: number;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = radios.length - 1;
  else if (event.key in STEP) next = (index + (STEP[event.key] ?? 0) + radios.length) % radios.length;
  else return;
  event.preventDefault();
  event.stopPropagation();
  const target = radios[next];
  target?.focus();
  target?.click();
};

/** Roving tabindex: the checked radio is the tab stop; with nothing checked, the first one. */
export const radioTabIndex = (checked: boolean, isFirst: boolean, anyChecked: boolean): 0 | -1 =>
  checked || (!anyChecked && isFirst) ? 0 : -1;
