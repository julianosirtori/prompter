import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Stamps dist/sw.js with a build id so every deploy gets its own offline cache. */
const stampServiceWorker = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const file = resolve(outDir, 'sw.js');
      const source = await readFile(file, 'utf8');
      await writeFile(file, source.replaceAll('__BUILD_ID__', Date.now().toString(36)));
    },
  };
};

// https://vite.dev/config/
// `npm run dev:phone` serves over HTTPS on the local network: phones only allow the camera on
// secure origins, and plain http://192.168.x.x is not one.
export default defineConfig(({ mode }) => ({
  plugins: [react(), stampServiceWorker(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: mode === 'phone' ? { host: true } : {},
}));
