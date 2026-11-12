import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Emits /sw.js from src/pwa/sw.js with the bundle's file list (precached on install) and a
 * cache id derived from that list, so the cache only changes when the build output does.
 */
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  async generateBundle(_options, bundle) {
    const assets = Object.keys(bundle)
      .filter((file) => !file.endsWith('.map') && file !== 'index.html')
      .sort()
      .map((file) => `/${file}`);
    const buildId = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 10);
    const template = await readFile(resolve(import.meta.dirname, 'src/pwa/sw.js'), 'utf8');
    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: template.replaceAll('__BUILD_ID__', buildId).replace('const ASSETS = __ASSETS__;', `const ASSETS = ${JSON.stringify(assets)};`),
    });
  },
});

// https://vite.dev/config/
// `npm run dev:phone` serves over HTTPS on the local network: phones only allow the camera on
// secure origins, and plain http://192.168.x.x is not one.
export default defineConfig(({ mode }) => ({
  plugins: [react(), serviceWorker(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: mode === 'phone' ? { host: true } : {},
}));
