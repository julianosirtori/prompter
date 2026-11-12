/*
 * Offline support. Hashed build assets are immutable (cache first); the page itself is network
 * first so a new deploy is picked up, falling back to the cached shell offline. Videos never pass
 * through here: they live in IndexedDB.
 *
 * __BUILD_ID__ is replaced at build time (vite.config.ts), so each deploy gets a fresh cache and
 * the previous one is deleted on activate.
 */
const CACHE = 'prompter-__BUILD_ID__';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
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

const putInCache = async (request, response) => {
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async (request) => {
  try {
    return await putInCache('/', await fetch(request));
  } catch {
    return (await caches.match('/')) ?? Response.error();
  }
};

const cacheFirst = async (request) => (await caches.match(request)) ?? putInCache(request, await fetch(request));

const staleWhileRevalidate = async (request, event) => {
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
    event.respondWith(networkFirst(request));
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
