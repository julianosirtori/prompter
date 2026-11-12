/** Small text helpers shared by the parser and the chunker. */

/** Lowercase and strip accents, for keyword matching. */
export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Remove inline markdown, normalize quotes and collapse whitespace. */
export const cleanInline = (value: string): string =>
  value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|$|[.,!?;:])/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const words = (value: string): string[] => value.split(/\s+/).filter(Boolean);

export const countWords = (value: string): number => words(value).length;

/** Lowercase ASCII slug for file names. */
export const slugify = (value: string, fallback = 'roteiro'): string => {
  const slug = fold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
};

/**
 * Split stage directions written in parentheses or brackets out of the spoken text.
 * "(sorri, sem falar)" → speech "", directions ["sorri, sem falar"].
 */
export const extractDirections = (value: string): { speech: string; directions: string[] } => {
  const directions: string[] = [];
  const speech = value.replace(/\(([^()]*)\)|\[([^[\]]*)\]/g, (_match, paren?: string, bracket?: string) => {
    const direction = (paren ?? bracket ?? '').trim();
    if (direction) directions.push(direction);
    return ' ';
  });
  return { speech: cleanInline(speech), directions };
};
