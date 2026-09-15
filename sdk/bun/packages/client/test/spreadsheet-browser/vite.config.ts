import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: { '@core3/client': resolve(import.meta.dirname, '../../src') } },
  server: { host: '127.0.0.1', port: 4319, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4320' } },
});
