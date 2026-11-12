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

/** Kept in `history.state`: the hash of the entry right below this one, when the app pushed it. */
interface EntryState {
  prev?: string;
}

const currentHash = (): string => window.location.hash || '#/';

const previousHash = (): string | undefined => (window.history.state as EntryState | null)?.prev;

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
  };
};

export const useRoute = (): Route => {
  const hash = useSyncExternalStore(subscribe, currentHash);
  return useMemo(() => parseHash(hash), [hash]);
};

/**
 * Goes to a route. A push remembers where it came from, so `goBack` can tell whether the
 * browser's own back would land on the right screen. `replace` swaps the current entry (a
 * finished session must not be reachable with back) and keeps that memory.
 */
export const navigate = (route: Route, options: { replace?: boolean } = {}): void => {
  const hash = routeToHash(route);
  const here = currentHash();
  if (options.replace) {
    window.history.replaceState({ prev: previousHash() } satisfies EntryState, '', hash);
  } else {
    if (hash === here) return;
    window.history.pushState({ prev: here } satisfies EntryState, '', hash);
  }
  listeners.forEach((listener) => listener());
};

/**
 * "Voltar" inside the app. When the entry below is the destination, pops the history like the
 * browser button would; otherwise (deep link, reload, came from somewhere else) replaces the
 * current entry so the stack never grows by going back. `alsoAccept` names other screens that
 * are fine to return to (a session opened from the takes screen goes back to it).
 */
export const goBack = (fallback: Route, alsoAccept?: (previous: Route) => boolean): void => {
  const previous = previousHash();
  const accepted = previous !== undefined && (previous === routeToHash(fallback) || alsoAccept?.(parseHash(previous)) === true);
  if (accepted) window.history.back();
  else navigate(fallback, { replace: true });
};
