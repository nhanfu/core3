import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export default defineConfig({
  test: {
    root: REPO_ROOT,
    environment: 'jsdom',
    setupFiles: [path.resolve(REPO_ROOT, 'test/setup.ts')],
    alias: [
      { find: '@core3/frontend/components', replacement: path.resolve(REPO_ROOT, 'lib/components/index.js') },
      { find: '@core3/frontend', replacement: path.resolve(REPO_ROOT, 'lib/index.js') },
      { find: '@core3/backend', replacement: path.resolve(REPO_ROOT, 'lib/backend.ts') },
    ],
  },
});
