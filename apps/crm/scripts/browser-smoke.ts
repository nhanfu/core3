import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const port = 3400 + Math.floor(Math.random() * 300);
const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-crm-browser-')), 'fixture.duckdb');
const server = Bun.spawn(['bun', 'server.ts'], {
  cwd: import.meta.dir.replace(/\/scripts$/, ''),
  env: { ...process.env, PORT: String(port), CRM_DB_PATH: databasePath },
  stdout: 'ignore',
  stderr: 'pipe',
});

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/modules`)).ok) break;
    } catch {}
    await Bun.sleep(50);
    if (attempt === 59) throw new Error('CRM server did not start');
  }

  const cases = [
    { name: 'desktop analytics', query: 'view=graph&filter=open&groupBy=team&sort=revenue', size: '1440,900', required: ['<title>CRM — Core3', 'Graph', 'Search opportunities'] },
    { name: 'narrow pipeline', query: 'view=pipeline', size: '390,844', required: ['<title>CRM — Core3', 'My Pipeline', 'CRM'] },
    { name: 'manager team workflow', query: 'view=team_form&id=team-na&role=manager', size: '1440,900', required: ['North America', 'Open team pipeline'] },
    { name: 'manager settings workflow', query: 'view=settings&role=manager', size: '1440,900', required: ['Pipeline stages', 'Stage requirements', 'Add configuration'] },
    { name: 'manager import workflow', query: 'view=import&role=manager', size: '1440,900', required: ['Import CRM records', 'Import CSV'] },
  ];

  for (const item of cases) {
    const result = Bun.spawnSync([
      'google-chrome', '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      `--window-size=${item.size}`, '--virtual-time-budget=2500', '--dump-dom',
      `http://127.0.0.1:${port}/?${item.query}`,
    ], { stdout: 'pipe', stderr: 'ignore' });
    const document = new TextDecoder().decode(result.stdout);
    const missing = item.required.filter(marker => !document.includes(marker));
    if (missing.length) throw new Error(`${item.name}: missing ${missing.join(', ')}`);
    console.log(`pass: ${item.name}`);
  }
} finally {
  server.kill();
}
