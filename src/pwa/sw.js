/*
 * Offline support. Template: the build (vite.config.ts) replaces __BUILD_ID__ with a hash of the
 * bundle and __ASSETS__ with its file list, then emits it as /sw.js.
 *
 * - install: precaches the shell and every bundle file, bypassing the HTTP cache, so the new
 *   cache is complete before activate deletes the previous one;
 * - the page: network first with a timeout, falling back to the cached shell offline;
 * - hashed /assets/*: cache first (immutable);
 * - icons, manifest and Google Fonts: stale while revalidate.
 * Videos never pass through here: they live in IndexedDB.
 *
 * skipWaiting is safe while the bundle has no lazy chunks; with code splitting, keep the old
 * cache until old tabs are gone.
 */
const CACHE = 'prompter-__BUILD_ID__';
const SHELL_URL = '/';
const ASSETS = __ASSETS__;
const STATIC = ['/manifest.webmanifest', '/icon.svg', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NAVIGATION_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL_URL, ...STATIC, ...ASSETS].map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('prompter-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const putInCache = async (key, response) => {
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(key, response.clone());
  }
  return response;
};

const isShell = (request, response) => {
  const { pathname } = new URL(request.url);
  const html = (response.headers.get('content-type') ?? '').startsWith('text/html');
  return html && (pathname === '/' || pathname === '/index.html');
};

/** Network first, but never wait more than a few seconds on a bad connection. */
const handleNavigation = (event) => {
  const { request } = event;
  const network = fetch(request).then(async (response) => {
    if (isShell(request, response)) await putInCache(SHELL_URL, response);
    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const timeout = new Promise((resolve) => setTimeout(resolve, NAVIGATION_TIMEOUT_MS));
  return Promise.race([network, timeout])
    .catch(() => undefined)
    .then(async (response) => response ?? (await caches.match(SHELL_URL)) ?? network)
    .catch(() => Response.error());
};

const cacheFirst = async (request) => (await caches.match(request)) ?? putInCache(request, await fetch(request));

const staleWhileRevalidate = async (event) => {
  const { request } = event;
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) ?? Response.error();
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
