import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { core3Components } from '@core3/client/vite';

const sampleRoot = resolve(import.meta.dirname);
const publicRoot = resolve(sampleRoot, 'public');
const clientRoot = resolve(sampleRoot, '../packages/client/src');
const serverRoot = resolve(sampleRoot, '../packages/server/src');
const backendPort = Number(process.env.CORE3_BACKEND_PORT || '3001');
const frontendPort = Number(process.env.CORE3_FRONTEND_PORT || '3002');

export default defineConfig({
  plugins: [core3Components()],
  root: publicRoot,
  publicDir: false,
  resolve: {
    alias: {
      '@core3/client': clientRoot,
      '@core3/server': serverRoot,
    },
  },
  server: {
    port: frontendPort,
    // The dev orchestrator checks the port before spawning Vite, but another
    // process can claim it in that small window. Let Vite advance to the next
    // port instead of terminating the whole dev stack.
    strictPort: false,
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
      '/services': `http://127.0.0.1:${backendPort}`,
      '/web': `http://127.0.0.1:${backendPort}`,
      '/jsonrpc': `http://127.0.0.1:${backendPort}`,
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
