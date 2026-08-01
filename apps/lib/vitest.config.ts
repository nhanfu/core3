import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    include: ['test/cases/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    alias: [
      { find: '@core3/frontend/components', replacement: path.resolve(__dirname, 'components/index.ts') },
      { find: '@core3/frontend', replacement: path.resolve(__dirname, 'index.ts') },
      { find: '@core3/backend', replacement: path.resolve(__dirname, 'backend.ts') },
    ],
  },
});
