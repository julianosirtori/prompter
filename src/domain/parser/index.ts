/** Entry point: pasted text → Script. Accepts markdown tables, box tables and plain text. */
import { buildScript, type DraftBlock } from '../script';
import { validateScript } from '../validate';
import type { ParseResult } from '../types';
import { extractDirections } from '../text';
import { parseTimeCell } from '../time';
import { detectColumns, isHeaderRow } from './columns';
import { readPlainText, type RawBlock } from './plainText';
import { isBoxTable, looksLikeTable, readBoxTable, readMarkdownTable, type Row } from './tables';

const fromTableRows = (rows: readonly Row[]): RawBlock[] => {
  const nonEmpty = rows.filter((row) => row.some(Boolean));
  const [first] = nonEmpty;
  const header = first && isHeaderRow(first) ? first : null;
  const body = header ? nonEmpty.slice(1) : nonEmpty;
  const columns = detectColumns(header, body);
  const cell = (row: Row, index: number) => (index >= 0 ? (row[index] ?? '') : '');

  return body.map((row) => ({
    time: parseTimeCell(cell(row, columns.time)),
    speech: cell(row, columns.speech),
    edit: cell(row, columns.edit),
    extra: columns.extra.map((index) => cell(row, index)).filter(Boolean),
  }));
};

const toDraft = (raw: RawBlock): DraftBlock => {
  const { speech, directions } = extractDirections(raw.speech);
  return { time: raw.time, speech, directions, edit: raw.edit.trim(), extra: raw.extra };
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

  const drafts = raw.map(toDraft).filter((draft) => draft.speech || draft.directions.length);
  if (drafts.length === 0) return { ok: false, error: 'unrecognized' };

  const script = buildScript({ source, title, drafts });
  return { ok: true, script, warnings: validateScript(script) };
};
