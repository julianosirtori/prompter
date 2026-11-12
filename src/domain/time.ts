/**
 * Parsing of the time column: "0–3s", "0-3s", "0 a 3s", "0:00–0:03", "00:00:03",
 * "3s" (end only), "3–7", "3,5s".
 */

export interface TimeSpec {
  start?: number;
  end?: number;
}

const NUMBER = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?|\d+(?:[.,]\d+)?`;
const UNIT = String.raw`\s*(s|seg|segs|segundos?)?(?![\p{L}])`;
const SEPARATOR = String.raw`\s*(?:–|—|-|a|até|ate|to)\s*`;
// Groups: 1 = first number, 2 = its unit, 3 = second number, 4 = its unit.
const SPEC = String.raw`\[?\s*(${NUMBER})${UNIT}(?:${SEPARATOR}(${NUMBER})${UNIT})?\s*\]?`;

const WHOLE_CELL = new RegExp(String.raw`^${SPEC}$`, 'iu');
/** Time at the start of a plain-text line, followed by a separator or a space. */
const LINE_PREFIX = new RegExp(String.raw`^\s*${SPEC}\s*(?:[:|·•]|\s[-–—]\s|\s)\s*`, 'iu');

/** "1:05" → 65, "00:01:05,5" → 65.5, "3,5" → 3.5. */
export const toSeconds = (token: string): number => {
  const parts = token.replace(',', '.').split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const toSpec = (first: string, second: string | undefined, singleMeansStart: boolean): TimeSpec => {
  const a = toSeconds(first);
  if (second === undefined) {
    // A lone "3s" is the end of the block; a lone "00:03" timestamp is its start.
    return singleMeansStart && first.includes(':') ? { start: a } : { end: a };
  }
  const b = toSeconds(second);
  return b > a ? { start: a, end: b } : { start: a };
};

/** Parse a whole table cell. Returns null when the cell is not a time. */
export const parseTimeCell = (cell: string): TimeSpec | null => {
  const match = WHOLE_CELL.exec(cell.trim());
  if (!match?.[1]) return null;
  return toSpec(match[1], match[3], false);
};

/** Parse a time at the beginning of a line, returning the remaining text. */
export const parseTimePrefix = (line: string): { time: TimeSpec; rest: string } | null => {
  const match = LINE_PREFIX.exec(line);
  if (!match?.[1]) return null;
  const [whole, first, firstUnit, second, secondUnit] = match;
  if (!first) return null;
  // In free text "3 motivos", "3-7 dicas" and "5 a 10 minutos" are speech: a time needs a
  // seconds unit, a colon ("0:03") or brackets ("[0–3]").
  const bracketed = whole.trimStart().startsWith('[');
  const looksLikeTime = Boolean(firstUnit ?? secondUnit) || first.includes(':') || bracketed;
  if (!looksLikeTime) return null;
  return { time: toSpec(first, second, true), rest: line.slice(match[0].length) };
};

/** "0–3s · 3s" style label. */
export const formatSeconds = (seconds: number): string => {
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}s`;
};

/** "00:06.1" style timestamp, used in exported cut markers. */
export const formatTimestamp = (seconds: number): string => {
  // Round first so 59.96 becomes 01:00.0, not 00:60.0.
  const safe = Math.round(Math.max(0, seconds) * 10) / 10;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${rest.toFixed(1).padStart(4, '0')}`;
};
