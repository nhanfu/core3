import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

test('renders stored dashboards with the real engine and disposes it when switching', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?dashboard=true');
  await expect(page.getByRole('status')).toHaveText('View only');
  await expect(page.locator('.o-spreadsheet')).toHaveCount(1);
  const value = (row: number) => page.evaluate(row => {
    const model = (window as any).spreadsheetTest.component.model;
    return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col: 0, row }).value;
  }, row);
  expect(await value(2)).toBe(30);
  expect(await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.model;
    return model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: 0, row: 0, content: '999' }).isSuccessful;
  })).toBe(false);
  await page.locator('.o-spreadsheet-dashboard-sidebar').getByRole('button', { name: '<Quarter two>', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('View only');
  await expect.poll(() => value(1)).toBe(100);
  await expect(page.locator('.o-spreadsheet')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '<Quarter two>', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/spreadsheet-dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.o-spreadsheet-dashboard-mobile-picker summary').click();
  await page.locator('.o-spreadsheet-dashboard-mobile-picker').getByRole('button', { name: 'Revenue', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('View only');
  await expect.poll(() => value(2)).toBe(30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/spreadsheet-dashboard-mobile.png', fullPage: true });
  await page.evaluate(() => (window as any).spreadsheetTest.component.dispose());
  await expect(page.locator('.o-spreadsheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mounts the real editor, evaluates and persists formulas, and exports OOXML', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByText('File', { exact: true })).toBeVisible();
  // Exercise the actual DOM input path, not just model.dispatch.
  const grid = page.locator('.o-grid-overlay');
  await grid.click({ position: { x: 80, y: 12 } });
  await page.locator('.o-composer').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('40');
  await page.keyboard.press('Enter');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download XLSX', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const actualFiles = unzipSync(Buffer.concat(chunks));
  expect(strFromU8(actualFiles['xl/worksheets/sheet0.xml'])).toContain('<v>40</v>');
  const result = await page.evaluate(async () => {
    const { Model, readWorkbook, exportWorkbookXlsx } = (window as any).spreadsheetTest;
    const model = new Model(readWorkbook({ version: 1, sheets: [{ name: 'Sheet1', cells: { A1: '10', A2: '20', A3: '=SUM(A1:A2)' } }] }));
    const sheetId = model.getters.getActiveSheetId();
    const before = model.getters.getEvaluatedCell({ sheetId, col: 0, row: 2 }).value;
    model.dispatch('UPDATE_CELL', { sheetId, col: 0, row: 0, content: '40' });
    const saved = JSON.stringify(model.exportData());
    const restored = new Model(JSON.parse(saved));
    const after = restored.getters.getEvaluatedCell({ sheetId, col: 0, row: 2 }).value;
    const xlsx = Array.from(await exportWorkbookXlsx(restored));
    model.updateMode('readonly');
    restored.updateMode('readonly');
    await Promise.all([model.leaveSession(), restored.leaveSession()]);
    return { before, after, xlsx };
  });
  expect(result.before).toBe(30);
  expect(result.after).toBe(60);
  const files = unzipSync(Uint8Array.from(result.xlsx));
  expect(Object.keys(files)).toContain('[Content_Types].xml');
  expect(strFromU8(files['xl/worksheets/sheet0.xml'])).toContain('SUM(A1:A2)');
  await page.screenshot({ path: 'test-results/spreadsheet-editor.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('readonly surface renders on mobile without page overflow and disposes cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.evaluate(() => {
    const component = (window as any).spreadsheetTest.component;
    component.setState({ mode: 'readonly', allow_export: false });
  });
  await expect(page.getByRole('status')).toHaveText('View only');
  await expect(page.getByRole('button', { name: 'Download XLSX' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/spreadsheet-viewer-mobile.png', fullPage: true });
  await page.evaluate(() => (window as any).spreadsheetTest.component.dispose());
  await expect(page.locator('.o-spreadsheet')).toHaveCount(0);
});

test('two engine clients converge after edits and structural commands', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const result = await page.evaluate(async () => {
    const { Model, LocalTransportService } = (window as any).spreadsheetTest;
    const transportService = new LocalTransportService();
    const a = new Model({}, { transportService, client: { id: 'a', name: 'Alice' } });
    const b = new Model(a.exportData(), { transportService, client: { id: 'b', name: 'Bob' } });
    const sheetId = a.getters.getActiveSheetId();
    a.dispatch('UPDATE_CELL', { sheetId, col: 0, row: 0, content: '41' });
    await new Promise(resolve => setTimeout(resolve, 50));
    b.dispatch('UPDATE_CELL', { sheetId, col: 1, row: 0, content: '=A1+1' });
    await new Promise(resolve => setTimeout(resolve, 50));
    const inserted = a.dispatch('ADD_COLUMNS_ROWS', { sheetId, dimension: 'ROW', base: 0, quantity: 1, position: 'before' });
    if (!inserted.isSuccessful) throw new Error('Row insertion was refused');
    await new Promise(resolve => setTimeout(resolve, 50));
    const left = a.exportData();
    const right = b.exportData();
    const value = b.getters.getEvaluatedCell({ sheetId, col: 1, row: 1 }).value;
    a.updateMode('readonly'); b.updateMode('readonly');
    await Promise.all([a.leaveSession(), b.leaveSession()]);
    return { left, right, value };
  });
  expect(result.left).toEqual(result.right);
  expect(result.value).toBe(42);
});

test('enterprise million-cell feasibility gate', async ({ page }, testInfo) => {
  test.skip(process.env.SPREADSHEET_BENCHMARK !== 'true', 'Run explicitly with SPREADSHEET_BENCHMARK=true');
  test.setTimeout(300_000);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const profiler = process.env.SPREADSHEET_PROFILE === 'true' ? await page.context().newCDPSession(page) : null;
  if (profiler) { await profiler.send('Profiler.enable'); await profiler.send('Profiler.start'); }
  const result = await page.evaluate(() => {
    const { Model } = (window as any).spreadsheetTest;
    const cells: Record<string, unknown> = {};
    for (let row = 1; row <= 100_000; row++) {
      for (let col = 0; col < 10; col++) {
        const column = String.fromCharCode(65 + col);
        cells[`${column}${row}`] = col === 9 ? `=A${row}+B${row}` : String(row + col);
      }
    }
    const started = performance.now();
    const model = new Model({ sheets: [{ id: 'large', name: 'Large workbook', colNumber: 10, rowNumber: 100_000, cells }] });
    const constructMs = performance.now() - started;
    model.dispatch('EVALUATE_CELLS');
    const last = model.getters.getEvaluatedCell({ sheetId: 'large', col: 9, row: 99_999 }).value;
    const loadMs = performance.now() - started;
    const updates: number[] = [];
    for (let i = 0; i < 30; i++) {
      const start = performance.now();
      model.dispatch('UPDATE_CELL', { sheetId: 'large', col: 0, row: i, content: String(i + 100) });
      model.getters.getEvaluatedCell({ sheetId: 'large', col: 9, row: i });
      updates.push(performance.now() - start);
    }
    const exportStart = performance.now();
    const bytes = JSON.stringify(model.exportData()).length;
    const serializeMs = performance.now() - exportStart;
    updates.sort((a, b) => a - b);
    model.updateMode('readonly');
    void model.leaveSession();
    return { cells: 1_000_000, formulas: 100_000, constructMs, loadMs, updateP95Ms: updates[Math.ceil(updates.length * .95) - 1], serializeMs, bytes, last, browser: navigator.userAgent };
  });
  if (profiler) {
    const { profile } = await profiler.send('Profiler.stop');
    await testInfo.attach('engine.cpuprofile', { body: JSON.stringify(profile), contentType: 'application/json' });
    const hottest = [...profile.nodes].sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0)).slice(0, 12)
      .map(node => ({ function: node.callFrame.functionName, samples: node.hitCount, line: node.callFrame.lineNumber }));
    console.log('CPU profile', JSON.stringify(hottest));
    await profiler.detach();
  }
  await testInfo.attach('million-cell-benchmark.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  console.log(JSON.stringify(result));
  expect(result.last).toBe(200001);
  expect.soft(result.loadMs, 'One-million-cell model load and calculation').toBeLessThan(10_000);
  expect.soft(result.updateP95Ms, 'Local command and dependent formula latency').toBeLessThan(100);
});

test('50 local engine clients converge; transport durability is a separate gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const result = await page.evaluate(async () => {
    const { Model, LocalTransportService } = (window as any).spreadsheetTest;
    const transportService = new LocalTransportService();
    const clients: any[] = [];
    for (let i = 0; i < 50; i++) {
      clients.push(new Model(clients[0]?.exportData() || {}, { transportService, client: { id: `editor-${i}`, name: `Editor ${i}` } }));
    }
    const sheetId = clients[0].getters.getActiveSheetId();
    for (let i = 0; i < clients.length; i++) {
      const result = clients[i].dispatch('UPDATE_CELL', { sheetId, col: 0, row: i, content: String(i + 1) });
      if (!result.isSuccessful) throw new Error(`Editor ${i} command failed`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    const snapshots = clients.map(model => JSON.stringify(model.exportData()));
    const cells = clients[0].exportData().sheets[0].cells;
    for (const model of clients) model.updateMode('readonly');
    await Promise.all(clients.map(model => model.leaveSession()));
    return { converged: new Set(snapshots).size === 1, cells };
  });
  expect(result.converged).toBe(true);
  expect(Object.keys(result.cells)).toHaveLength(50);
  expect(result.cells.A50).toBe('50');
});
