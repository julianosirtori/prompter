/** Hash-based navigation: enough for the browser back button, no routing library. */
import { useMemo, useSyncExternalStore } from 'react';
import type { BlockRange } from '../domain/timeline';

export type SessionKind = 'rehearsal' | 'record';

export type Route =
  | { name: 'home' }
  | { name: 'review'; scriptId: string }
  | { name: 'session'; scriptId: string; kind: SessionKind; range: BlockRange | null }
  | { name: 'takes'; scriptId: string; takeId: string | null };

const SESSION_SEGMENT: Record<SessionKind, string> = { rehearsal: 'ensaio', record: 'gravar' };

export const routeToHash = (route: Route): string => {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'review':
      return `#/roteiro/${route.scriptId}`;
    case 'session': {
      const query = route.range ? `?de=${route.range.from + 1}&ate=${route.range.to + 1}` : '';
      return `#/roteiro/${route.scriptId}/${SESSION_SEGMENT[route.kind]}${query}`;
    }
    case 'takes':
      return `#/roteiro/${route.scriptId}/takes${route.takeId ? `/${route.takeId}` : ''}`;
  }
};

/** "?de=4&ate=5" (1-based, inclusive) → block range. */
const parseRange = (query: string | undefined): BlockRange | null => {
  const params = new URLSearchParams(query ?? '');
  const from = Number(params.get('de'));
  const to = Number(params.get('ate'));
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return null;
  return { from: from - 1, to: to - 1 };
};

export const parseHash = (hash: string): Route => {
  const [path = '', query] = hash.replace(/^#\/?/, '').split('?');
  const [root, scriptId, section, detail] = path.split('/');
  if (root !== 'roteiro' || !scriptId) return { name: 'home' };
  if (section === SESSION_SEGMENT.rehearsal) return { name: 'session', scriptId, kind: 'rehearsal', range: parseRange(query) };
  if (section === SESSION_SEGMENT.record) return { name: 'session', scriptId, kind: 'record', range: parseRange(query) };
  if (section === 'takes') return { name: 'takes', scriptId, takeId: detail || null };
  return { name: 'review', scriptId };
};

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

const getHash = (): string => window.location.hash;

export const useRoute = (): Route => {
  const hash = useSyncExternalStore(subscribe, getHash);
  return useMemo(() => parseHash(hash), [hash]);
};

/** `replace` keeps the back button from returning to a finished session. */
export const navigate = (route: Route, options: { replace?: boolean } = {}): void => {
  const hash = routeToHash(route);
  if (options.replace) window.location.replace(hash);
  else window.location.hash = hash;
};
