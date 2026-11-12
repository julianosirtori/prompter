/**
 * Cut markers: the real start and end of each block inside the video file, with its speech and
 * edit note, so the edit can be laid out next to CapCut without guessing.
 */
import { formatSeconds, formatTimestamp } from './time';
import type { Take } from './take';
import type { Script } from './types';

const QUOTE_LIMIT = 40;

const shorten = (text: string): string => (text.length > QUOTE_LIMIT ? `${text.slice(0, QUOTE_LIMIT - 1)}…` : text);

const blockLabel = (index: number): string => `B${index + 1}`;

export const cutMarkersText = (script: Script, take: Take): string => {
  const header = `${script.title} · take ${take.number} · ${formatSeconds(take.duration)}`;
  const lines = take.marks.map((mark) => {
    const block = script.blocks[mark.blockIndex];
    const said = block?.speech ? `"${shorten(block.speech)}"` : `(${block?.directions.join(', ') ?? ''})`;
    const edit = block?.edit ? `  → ${block.edit}` : '';
    return `${formatTimestamp(mark.start)} – ${formatTimestamp(mark.end)}  ${blockLabel(mark.blockIndex)}  ${said}${edit}`;
  });
  return [header, ...lines].join('\n') + '\n';
};

/** RFC 4180: quote every text field and double inner quotes. */
const csvField = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const cutMarkersCsv = (script: Script, take: Take): string => {
  const rows = take.marks.map((mark) => {
    const block = script.blocks[mark.blockIndex];
    return [
      String(mark.blockIndex + 1),
      mark.start.toFixed(2),
      mark.end.toFixed(2),
      csvField(block?.speech ?? ''),
      csvField(block?.edit ?? ''),
    ].join(',');
  });
  // The BOM makes Excel read the file as UTF-8 (accents in "edição").
  return '\uFEFF' + ['bloco,inicio_s,fim_s,fala,edicao', ...rows].join('\n') + '\n';
};
