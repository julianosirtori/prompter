/** Entry point: pasted text → Script. Accepts markdown tables, box tables and plain text. */
import { buildScript, type DraftBlock } from '../script';
import { validateScript } from '../validate';
import type { ParseResult } from '../types';
import { cleanInline, extractDirections, fold } from '../text';
import { parseTimeCell, type TimeSpec } from '../time';
import { detectColumns, isHeaderRow } from './columns';
import { readPlainText, type RawBlock } from './plainText';
import { isBoxTable, looksLikeTable, readBoxTable, readMarkdownTable, type Row } from './tables';

/**
 * Reads a time column as a whole. Ranges are taken as they are. When every cell is a single
 * value, the column decides what it means: "0:00 / 0:03" are start timestamps, "3s / 4s" under
 * "Duração" (or values that do not increase) are durations, otherwise they are block ends.
 */
const interpretTimeColumn = (cells: readonly string[], header: string): (TimeSpec | null)[] => {
  const specs = cells.map(parseTimeCell);
  const singles = specs.filter((spec) => spec && spec.start === undefined && spec.end !== undefined);
  if (singles.length === 0 || singles.length !== specs.filter(Boolean).length) return specs;

  if (cells.some((cell) => cell.includes(':'))) {
    return specs.map((spec) => (spec?.end === undefined ? spec : { start: spec.end }));
  }
  const values = specs.map((spec) => spec?.end ?? 0);
  const increasing = values.every((value, index) => index === 0 || value > (values[index - 1] ?? 0));
  const namedDuration = /\bdura(cao|tion)\b/.test(fold(header));
  if (!namedDuration && increasing) return specs;

  let cursor = 0;
  return specs.map((spec) => {
    if (spec?.end === undefined) return spec;
    const span = { start: cursor, end: cursor + spec.end };
    cursor = span.end;
    return span;
  });
};

const fromTableRows = (rows: readonly Row[]): RawBlock[] => {
  const nonEmpty = rows.filter((row) => row.some(Boolean));
  const [first] = nonEmpty;
  const header = first && isHeaderRow(first) ? first : null;
  const body = header ? nonEmpty.slice(1) : nonEmpty;
  const columns = detectColumns(header, body);
  const cell = (row: Row, index: number) => (index >= 0 ? (row[index] ?? '') : '');

  const times = interpretTimeColumn(
    body.map((row) => cell(row, columns.time)),
    header ? cell(header, columns.time) : '',
  );

  return body.map((row, index) => ({
    time: times[index] ?? null,
    speech: cell(row, columns.speech),
    edit: cell(row, columns.edit),
    extra: columns.extra.map((column) => cell(row, column)).filter(Boolean),
  }));
};

const toDraft = (raw: RawBlock): DraftBlock => {
  const { speech, directions } = extractDirections(raw.speech);
  return {
    time: raw.time,
    speech,
    directions,
    edit: cleanInline(raw.edit),
    extra: raw.extra.map(cleanInline).filter(Boolean),
  };
};

export const parseScript = (source: string): ParseResult => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  if (!lines.some((line) => line.trim())) return { ok: false, error: 'empty' };

  let title: string | null = null;
  let raw: RawBlock[];
  if (looksLikeTable(lines)) {
    raw = fromTableRows(isBoxTable(lines) ? readBoxTable(lines) : readMarkdownTable(lines));
  } else {
    const plain = readPlainText(lines);
    title = plain.title;
    raw = plain.blocks;
  }

  // A row with only a time or an edit note is a silent block (e.g. B-roll), not noise.
  const drafts = raw
    .map(toDraft)
    .filter((draft) => draft.speech || draft.directions.length || draft.edit || draft.time);
  if (drafts.length === 0) return { ok: false, error: 'unrecognized' };

  const script = buildScript({ source, title, drafts });
  return { ok: true, script, warnings: validateScript(script) };
};
