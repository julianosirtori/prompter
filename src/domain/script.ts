/** Building scripts and the edits the review screen applies to them. All functions are pure. */
import { splitIntoChunks } from './chunking';
import { estimateDuration } from './pace';
import { extractDirections, fold, slugify, words } from './text';
import type { TimeSpec } from './time';
import { blockDuration, type Block, type Script } from './types';

export interface DraftBlock {
  time: TimeSpec | null;
  speech: string;
  directions: string[];
  edit: string;
  extra: string[];
}

const newId = (): string => crypto.randomUUID();

const round = (seconds: number): number => Math.round(seconds * 100) / 100;

/**
 * Fills missing starts and ends. A missing start follows the previous block; a missing end is
 * the next block's start or, failing that, an estimate from the word count.
 */
const resolveTimes = (drafts: readonly DraftBlock[]): { spans: { start: number; end: number }[]; estimated: boolean } => {
  let estimated = false;
  let cursor = 0;
  const spans = drafts.map((draft, index) => {
    const start = draft.time?.start ?? cursor;
    const nextStart = drafts[index + 1]?.time?.start;
    let end = draft.time?.end;
    if (end === undefined || end <= start) {
      if (nextStart !== undefined && nextStart > start) {
        end = nextStart;
      } else {
        end = start + estimateDuration(draft.speech);
        estimated = true;
      }
    }
    cursor = end;
    return { start: round(start), end: round(end) };
  });
  return { spans, estimated };
};

/** CamelCase names that are other people's products, not the one being advertised. */
const KNOWN_BRANDS = new Set(['whatsapp', 'youtube', 'tiktok', 'linkedin', 'iphone', 'ipad', 'macbook', 'facebook', 'chatgpt', 'capcut', 'testflight', 'appstore', 'googleplay']);

/**
 * App names are usually written in CamelCase ("FisioRotina") or as a domain
 * ("fisiorotina.com.br"). A CamelCase word matching the domain wins.
 */
export const inferTitle = (texts: readonly string[]): string => {
  const all = texts.join(' ');
  const camels = [...all.matchAll(/(?<![\p{L}])[A-ZÀ-Ú][a-zà-ú]+[A-ZÀ-Ú][\p{L}]+/gu)]
    .map((match) => match[0])
    .filter((name) => !KNOWN_BRANDS.has(fold(name)));
  const domain = /\b([a-z0-9-]+)\.(?:com|app|io|ai|dev)(?:\.br)?\b/i.exec(all)?.[1];
  if (domain) {
    const matching = camels.find((name) => fold(name) === fold(domain));
    return matching ?? domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  if (camels[0]) return camels[0];
  const firstSpeech = texts.find((text) => text.trim()) ?? '';
  return words(firstSpeech).slice(0, 4).join(' ').replace(/[,.;:!?]+$/, '') || 'Roteiro sem título';
};

export const buildScript = ({
  source,
  title,
  drafts,
}: {
  source: string;
  title: string | null;
  drafts: readonly DraftBlock[];
}): Script => {
  const { spans, estimated } = resolveTimes(drafts);
  const blocks: Block[] = drafts.map((draft, index) => {
    const span = spans[index] ?? { start: 0, end: estimateDuration(draft.speech) };
    return {
      id: newId(),
      start: span.start,
      end: span.end,
      speech: draft.speech,
      directions: draft.directions,
      edit: draft.edit,
      extra: draft.extra,
      chunks: splitIntoChunks(draft.speech),
    };
  });
  const resolvedTitle = title || inferTitle(drafts.flatMap((draft) => [draft.speech, draft.edit]));
  const now = Date.now();
  return {
    id: newId(),
    title: resolvedTitle,
    slug: slugify(resolvedTitle),
    source,
    blocks,
    timesEstimated: estimated,
    createdAt: now,
    updatedAt: now,
  };
};

const touch = (script: Script, blocks: Block[]): Script => ({ ...script, blocks, updatedAt: Date.now() });

const mapBlock = (script: Script, blockId: string, update: (block: Block) => Block): Script =>
  touch(
    script,
    script.blocks.map((block) => (block.id === blockId ? update(block) : block)),
  );

export const renameScript = (script: Script, title: string): Script => ({
  ...script,
  title,
  slug: slugify(title),
  updatedAt: Date.now(),
});

/** Editing speech re-extracts directions written inline and re-chunks the text. */
export const setBlockSpeech = (script: Script, blockId: string, text: string): Script =>
  mapBlock(script, blockId, (block) => {
    const { speech, directions } = extractDirections(text);
    return { ...block, speech, directions: directions.length ? directions : block.directions, chunks: splitIntoChunks(speech) };
  });

export const setBlockEdit = (script: Script, blockId: string, edit: string): Script =>
  mapBlock(script, blockId, (block) => ({ ...block, edit }));

/** Chunks are edited as text with "|" between them; words must stay the same. */
export const setBlockChunks = (script: Script, blockId: string, chunks: readonly string[]): Script =>
  mapBlock(script, blockId, (block) => {
    const cleaned = chunks.map((chunk) => chunk.trim()).filter(Boolean);
    const sameWords = words(cleaned.join(' ')).join(' ') === words(block.speech).join(' ');
    return sameWords ? { ...block, chunks: cleaned } : block;
  });

/**
 * Changes one block's duration and shifts every later block by the difference,
 * so the script stays contiguous.
 */
export const setBlockDuration = (script: Script, blockId: string, seconds: number): Script => {
  const index = script.blocks.findIndex((block) => block.id === blockId);
  const target = script.blocks[index];
  if (!target || seconds <= 0) return script;
  const delta = round(seconds - blockDuration(target));
  return touch(
    script,
    script.blocks.map((block, i) => {
      if (i < index) return block;
      if (i === index) return { ...block, end: round(block.start + seconds) };
      return { ...block, start: round(block.start + delta), end: round(block.end + delta) };
    }),
  );
};

/** Replaces all durations at once (used by "Usar meus tempos" after a rehearsal). */
export const applyDurations = (script: Script, durations: readonly number[]): Script => {
  let cursor = script.blocks[0]?.start ?? 0;
  return touch(
    script,
    script.blocks.map((block, index) => {
      const duration = durations[index] ?? blockDuration(block);
      const next = { ...block, start: round(cursor), end: round(cursor + duration) };
      cursor += duration;
      return next;
    }),
  );
};

/** Closes gaps and removes overlaps by making every block start where the previous one ends. */
export const makeContiguous = (script: Script): Script =>
  applyDurations(
    script,
    script.blocks.map((block) => blockDuration(block)),
  );

export const removeBlock = (script: Script, blockId: string): Script =>
  script.blocks.length <= 1 ? script : touch(script, script.blocks.filter((block) => block.id !== blockId));

export const insertBlockAfter = (script: Script, blockId: string): Script => {
  const index = script.blocks.findIndex((block) => block.id === blockId);
  const previous = script.blocks[index];
  if (!previous) return script;
  const block: Block = {
    id: newId(),
    start: previous.end,
    end: round(previous.end + estimateDuration('')),
    speech: '',
    directions: [],
    edit: '',
    extra: [],
    chunks: [],
  };
  const blocks = [...script.blocks];
  blocks.splice(index + 1, 0, block);
  return makeContiguous(touch(script, blocks));
};

/** Turns a block into a silent one; its text becomes the direction. */
export const markDirectionOnly = (script: Script, blockId: string): Script =>
  mapBlock(script, blockId, (block) => ({
    ...block,
    directions: [...block.directions, block.speech].filter(Boolean),
    speech: '',
    chunks: [],
  }));

export const totalDuration = (script: Pick<Script, 'blocks'>): number => {
  const first = script.blocks[0];
  const last = script.blocks.at(-1);
  return first && last ? round(last.end - first.start) : 0;
};
