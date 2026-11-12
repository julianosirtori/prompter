/** Decides which table column is time, speech and edit notes. */
import { fold } from '../text';
import { parseTimeCell } from '../time';
import { findTimeColumn, type Row } from './tables';

export interface ColumnMap {
  time: number;
  speech: number;
  edit: number;
  extra: number[];
}

const HEADER_KEYWORDS = {
  time: ['tempo', 'time', 'seg', 'duracao', 'momento', 'timing'],
  speech: ['voce fala', 'fala', 'falar', 'texto', 'narracao', 'roteiro', 'audio', 'locucao'],
  edit: ['edicao', 'o que eu ponho', 'visual', 'tela', 'b-roll', 'broll', 'cena', 'observacao', 'obs'],
} as const;

type Role = keyof typeof HEADER_KEYWORDS;

const roleOfHeader = (cell: string): Role | null => {
  const folded = fold(cell);
  if (!folded) return null;
  // Check edit before speech: "O que eu ponho na edição" must not match "fala".
  for (const role of ['time', 'edit', 'speech'] as const) {
    if (HEADER_KEYWORDS[role].some((keyword) => folded.includes(keyword))) return role;
  }
  return null;
};

/** A header row names at least one known column and contains no time values. */
export const isHeaderRow = (row: Row): boolean =>
  row.some((cell) => roleOfHeader(cell) !== null) && row.every((cell) => parseTimeCell(cell) === null);

const averageLength = (rows: readonly Row[], column: number): number =>
  rows.reduce((sum, row) => sum + (row[column]?.length ?? 0), 0) / Math.max(1, rows.length);

export const detectColumns = (header: Row | null, body: readonly Row[]): ColumnMap => {
  const width = Math.max(header?.length ?? 0, ...body.map((row) => row.length));
  const columns = Array.from({ length: width }, (_, index) => index);
  const map: ColumnMap = { time: -1, speech: -1, edit: -1, extra: [] };

  if (header) {
    header.forEach((cell, index) => {
      const role = roleOfHeader(cell);
      if (role && map[role] === -1) map[role] = index;
    });
  }

  if (map.time === -1) map.time = findTimeColumn(body);

  const free = () => columns.filter((index) => index !== map.time && index !== map.speech && index !== map.edit);
  if (map.speech === -1) {
    const longest = free().sort((a, b) => averageLength(body, b) - averageLength(body, a))[0];
    map.speech = longest ?? -1;
  }
  if (map.edit === -1) map.edit = free()[0] ?? -1;
  map.extra = free();
  return map;
};
