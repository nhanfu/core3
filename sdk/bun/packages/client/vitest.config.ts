import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { core3Components } from './src/vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const clientRoot = fileURLToPath(new URL('./src', import.meta.url)).replaceAll('\\', '/');
const serverRoot = fileURLToPath(new URL('../server/src', import.meta.url)).replaceAll('\\', '/');

export default defineConfig({
  plugins: [core3Components()],
  root: __dirname,
  resolve: {
    alias: {
      '@core3/client': clientRoot,
      '@core3/server': serverRoot,
    },
  },
  test: {
    include: ['test/cases/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
