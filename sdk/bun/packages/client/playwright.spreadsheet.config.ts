import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/spreadsheet-browser',
  testMatch: '*.spec.ts',
  timeout: 120_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4319', viewport: { width: 1440, height: 900 }, headless: true, actionTimeout: 15_000 },
  webServer: [{
    command: 'bunx vite --config test/spreadsheet-browser/vite.config.ts',
    url: 'http://127.0.0.1:4319',
    reuseExistingServer: false,
    timeout: 60_000,
  }, {
    command: 'bun ../../sample/test/workbook-browser-server.ts',
    url: 'http://127.0.0.1:4320/health',
    reuseExistingServer: false,
    timeout: 60_000,
  }],
});
