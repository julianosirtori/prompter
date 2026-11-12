/** PT-BR labels built from domain values. Presentation only: the numbers come from src/domain. */
import { averagePace, paceLabel, type PaceLabel } from '../domain/pace';
import { totalDuration } from '../domain/script';
import { rangeLabel, type BlockPace, type Take } from '../domain/take';
import { formatSeconds } from '../domain/time';
import type { BlockRange } from '../domain/timeline';
import { blockDuration, type Block, type Script, type ScriptWarning } from '../domain/types';

const PACE_TEXT: Record<PaceLabel, string> = {
  calmo: 'Calmo',
  natural: 'Natural',
  rapido: 'Rápido: considere cortar texto',
};

const decimal = (value: number): string =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "3" from "3s". */
const bare = (seconds: number): string => formatSeconds(seconds).slice(0, -1);

/** Always one decimal: "8,0s". */
export const preciseSeconds = (seconds: number): string => `${decimal(seconds)}s`;

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const blockCountLabel = (count: number): string => `${count} ${count === 1 ? 'bloco' : 'blocos'}`;

export const scriptSummary = (script: Pick<Script, 'blocks'>): string =>
  `${formatSeconds(totalDuration(script))} · ${blockCountLabel(script.blocks.length)}`;

export const paceSummary = (blocks: readonly Block[]): { label: PaceLabel; text: string } | null => {
  const rate = averagePace(blocks);
  if (rate === 0) return null;
  const label = paceLabel(rate);
  return { label, text: `${decimal(rate)} palavras/s · ${PACE_TEXT[label]}` };
};

/** "0–3s". */
export const blockSpanLabel = (block: Block): string => `${bare(block.start)}–${formatSeconds(block.end)}`;

/** "0–3s · 3s". */
export const blockTimeLabel = (block: Block): string =>
  `${blockSpanLabel(block)} · ${formatSeconds(blockDuration(block))}`;

export const warningText = (warning: ScriptWarning): string => {
  switch (warning.kind) {
    case 'gap':
      return `Há ${formatSeconds(warning.seconds)} sem fala entre os blocos ${warning.afterBlock + 1} e ${warning.afterBlock + 2}.`;
    case 'overlap':
      return `Os blocos ${warning.afterBlock + 1} e ${warning.afterBlock + 2} se sobrepõem em ${formatSeconds(warning.seconds)}.`;
    case 'tight':
      return `Apertado: ${warning.words} palavras em ${formatSeconds(warning.seconds)}. Fale rápido ou corte texto.`;
    case 'estimated':
      return 'Tempos estimados';
  }
};

/** Stable identity of a warning, for dismissing it. */
export const warningKey = (warning: ScriptWarning): string =>
  warning.kind === 'gap' || warning.kind === 'overlap' ? `${warning.kind}-${warning.afterBlock}` : warning.kind;

/** "0:07". */
export const clockLabel = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** "+1,2s" behind the script, "−0,8s" ahead. */
export const signedSeconds = (seconds: number): string => `${seconds < 0 ? '−' : '+'}${decimal(Math.abs(seconds))}s`;

export const takeLabel = (take: Take): string =>
  `Take ${take.number} · ${rangeLabel(take.range, take.complete)} · ${preciseSeconds(take.duration)}`;

export const rerecordLabel = (range: BlockRange): string =>
  range.from === range.to ? `Regravar bloco ${range.from + 1}` : `Regravar blocos ${range.from + 1}–${range.to + 1}`;

/** Rehearsal table: "você foi mais rápido". */
export const rehearsalVerdict = (pace: BlockPace): string => {
  if (!pace.offPace) return 'no tempo';
  return pace.difference < 0 ? 'você foi mais rápido' : 'você foi mais devagar';
};

/** Take review: "você terminou de falar 1,1s antes". */
export const takeVerdict = (pace: BlockPace): string => {
  const amount = Math.abs(pace.difference);
  if (amount < 0.05) return 'no tempo do roteiro';
  return `você terminou de falar ${preciseSeconds(amount)} ${pace.difference < 0 ? 'antes' : 'depois'}`;
};
