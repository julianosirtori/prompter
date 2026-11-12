/**
 * Turns pasted tables into rows of cells. Two input styles:
 *  - markdown: `| a | b |` with an optional `|---|---|` separator line;
 *  - box drawing: ┌─┬─┐ │ ├─┼─┤ (or ASCII +--+ |), where a cell may wrap over several lines.
 */
import { parseTimeCell } from '../time';

export type Row = string[];

const VERTICAL = /[│┃║|]/;
const BOX_BORDER_CHARS = /^[\s┌┬┐├┼┤└┴┘─━═╔╗╚╝╠╣╦╩╬╒╓╕╖╘╙╛╜╞╟╡╢╤╥╧╨╪╫+\-=:|│┃║]+$/;
const BOX_CHARS = /[┌┬┐├┼┤└┴┘─━═╔╗╚╝╠╣╦╩╬│┃║]/;
/** ASCII box border: `+----+----+`. */
const ASCII_BORDER = /^\s*\+[-=+:]+\+\s*$/;

/** A line made only of border characters (`├───┼───┤`, `+---+`, `|---|:--|`). */
const isBorderLine = (line: string): boolean =>
  line.trim().length > 0 && BOX_BORDER_CHARS.test(line) && /[─━═-]/.test(line);

const splitCells = (line: string): string[] => {
  const trimmed = line.trim().replace(/^[│┃║|]/, '').replace(/[│┃║|]$/, '');
  return trimmed.split(/[│┃║|]/).map((cell) => cell.trim());
};

export const looksLikeTable = (lines: readonly string[]): boolean => {
  const withVerticals = lines.filter((line) => VERTICAL.test(line) && splitCells(line).length >= 2);
  return withVerticals.length >= 2;
};

export const isBoxTable = (lines: readonly string[]): boolean =>
  lines.some((line) => BOX_CHARS.test(line) || ASCII_BORDER.test(line));

/** Markdown: one line per row, separator line ignored. */
export const readMarkdownTable = (lines: readonly string[]): Row[] =>
  lines.filter((line) => VERTICAL.test(line) && !isBorderLine(line)).map(splitCells);

const mergeLines = (lines: readonly Row[]): Row => {
  const width = Math.max(...lines.map((cells) => cells.length));
  return Array.from({ length: width }, (_, column) =>
    lines
      .map((cells) => cells[column] ?? '')
      .filter(Boolean)
      .join(' '),
  );
};

/**
 * Box tables: consecutive content lines between two borders form one row, even when the time
 * cell itself wraps ("[0:07 –" / "0:12]"). Only when the joined time cell is not a single time
 * (a table without inner borders) does each timed line start a new row.
 */
export const readBoxTable = (lines: readonly string[]): Row[] => {
  const groups: Row[][] = [];
  let current: Row[] = [];
  for (const line of lines) {
    if (isBorderLine(line) || !VERTICAL.test(line)) {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    current.push(splitCells(line));
  }
  if (current.length) groups.push(current);

  const timeColumn = findTimeColumn(groups.flat());
  const rows: Row[] = [];
  for (const group of groups) {
    const merged = mergeLines(group);
    if (timeColumn === -1 || parseTimeCell(merged[timeColumn] ?? '') !== null) {
      rows.push(merged);
      continue;
    }
    let pending: Row[] = [];
    for (const cells of group) {
      const startsRow = parseTimeCell(cells[timeColumn] ?? '') !== null;
      if (startsRow && pending.length) {
        rows.push(mergeLines(pending));
        pending = [];
      }
      pending.push(cells);
    }
    if (pending.length) rows.push(mergeLines(pending));
  }
  return rows;
};

/** Column where most non-empty cells are times, or -1. */
export const findTimeColumn = (rows: readonly Row[]): number => {
  const width = Math.max(0, ...rows.map((row) => row.length));
  let best = -1;
  let bestRatio = 0;
  for (let column = 0; column < width; column++) {
    const cells = rows.map((row) => row[column] ?? '').filter(Boolean);
    if (cells.length === 0) continue;
    const ratio = cells.filter((cell) => parseTimeCell(cell) !== null).length / cells.length;
    if (ratio > bestRatio) {
      best = column;
      bestRatio = ratio;
    }
  }
  return bestRatio >= 0.5 ? best : -1;
};
