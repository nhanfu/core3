import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    alias: [
      { find: '@core3/frontend/components', replacement: path.resolve(__dirname, 'lib/components/index.js') },
      { find: '@core3/frontend', replacement: path.resolve(__dirname, 'lib/index.js') },
      { find: '@core3/backend', replacement: path.resolve(__dirname, 'lib/backend.ts') },
    ],
  },
});
