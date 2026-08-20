import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const sampleRoot = resolve(import.meta.dirname);
const publicRoot = resolve(sampleRoot, 'public');
const clientRoot = resolve(sampleRoot, '../packages/client/src');
const serverRoot = resolve(sampleRoot, '../packages/server/src');

export default defineConfig({
  root: publicRoot,
  publicDir: false,
  resolve: {
    alias: {
      '@core3/client': clientRoot,
      '@core3/server': serverRoot,
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/services': 'http://127.0.0.1:3001',
      '/web': 'http://127.0.0.1:3001',
      '/jsonrpc': 'http://127.0.0.1:3001',
    },
  },
  build: {
    outDir: resolve(sampleRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(publicRoot, 'index.html'),
    },
  },
});
