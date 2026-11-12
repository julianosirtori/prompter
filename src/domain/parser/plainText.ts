/**
 * Plain-text scripts:
 *  - timed lines: "0–3s Fisio autônomo: ...", "[0:00–0:03] ...", "0-3s | fala | edição";
 *  - edit notes after a prefix: "fala — Edição: ...", "Visual: ...", "B-roll: ...";
 *  - untimed lines: each non-empty line is a block.
 * Markdown headings are skipped (the first one becomes the title).
 */
import { cleanInline } from '../text';
import { parseTimePrefix, type TimeSpec } from '../time';

export interface RawBlock {
  time: TimeSpec | null;
  speech: string;
  edit: string;
  extra: string[];
}

const EDIT_PREFIX = /\s*(?:[—–-]\s*)?\b(?:na edi[çc][ãa]o|edi[çc][ãa]o|visual|b-?roll)\s*:\s*/i;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const LIST_MARKER = /^\s*(?:[-*•]|\d+[.)])\s+/;

const splitSpeechAndEdit = (text: string): { speech: string; edit: string; extra: string[] } => {
  const cells = text.split('|').map((cell) => cell.trim());
  if (cells.length > 1) {
    const [speech = '', edit = '', ...extra] = cells;
    return { speech, edit, extra };
  }
  const match = EDIT_PREFIX.exec(text);
  if (match) {
    return { speech: text.slice(0, match.index).trim(), edit: text.slice(match.index + match[0].length).trim(), extra: [] };
  }
  return { speech: text.trim(), edit: '', extra: [] };
};

export const readPlainText = (lines: readonly string[]): { title: string | null; blocks: RawBlock[] } => {
  let title: string | null = null;
  const content: string[] = [];
  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      title ??= cleanInline(heading[1] ?? '');
      continue;
    }
    if (line.trim()) content.push(line.replace(LIST_MARKER, ''));
  }

  const timed = content.some((line) => parseTimePrefix(line) !== null);
  const blocks: RawBlock[] = [];
  for (const line of content) {
    const prefixed = timed ? parseTimePrefix(line) : null;
    const isEditOnly = EDIT_PREFIX.exec(line)?.index === 0;
    const previous = blocks.at(-1);

    if (timed && !prefixed && previous) {
      // In a timed script an untimed line continues the previous block.
      if (isEditOnly) previous.edit = [previous.edit, splitSpeechAndEdit(line).edit].filter(Boolean).join(' ');
      else previous.speech = [previous.speech, line.trim()].join(' ');
      continue;
    }
    if (isEditOnly && previous) {
      previous.edit = [previous.edit, splitSpeechAndEdit(line).edit].filter(Boolean).join(' ');
      continue;
    }
    const parts = splitSpeechAndEdit(prefixed ? prefixed.rest : line);
    blocks.push({ time: prefixed?.time ?? null, ...parts });
  }
  return { title, blocks };
};
