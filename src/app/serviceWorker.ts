/**
 * Registers the offline service worker in production builds only: in development it would
 * cache Vite's modules and hide code changes.
 */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  });
};
