import { expect, test } from 'bun:test';
import { WorkbookEngine } from '@core3/server/workbook-engine';

test('stopping preparation during a datasource read does not restart the engine when the read returns', async () => {
  const engine = new WorkbookEngine();
  let entered!: () => void, release!: () => void;
  const reading = new Promise<void>(resolve => { entered = resolve; });
  const response = new Promise<void>(resolve => { release = resolve; });
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const render = engine.render('prepare_export', 'START_REVISION', {
    snapshot: { revisionId: 'START_REVISION', sheets: [{ id: 's', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: { A1: '=CORE3.VALUE("test","amount",1,"{}")' } }] }, revisions: [],
  }, [{ key: 'test', label: 'Test', columns: [{ field: 'amount', label: 'Amount' }], filters: {}, max_rows: 50 }], async () => {
    entered(); await response; return { data: [{ amount: 42 }] };
  }, 100);
  try {
    await Promise.race([reading, render.then(() => { throw new Error('Expected a live datasource read'); }), new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('Datasource read did not start')), 10000);
    })]);
    engine.stop();
    release();
    await expect(render).rejects.toMatchObject({ code: 'WORKBOOK_ENGINE_UNAVAILABLE' });
    expect((engine as any).worker).toBeUndefined();
    const file = await engine.exportSnapshot({ sheets: [{ id: 's', name: 'Next job', colNumber: 26, rowNumber: 100, cells: { A1: '7' } }] });
    expect(file.byteLength).toBeGreaterThan(0);
  } finally {
    clearTimeout(deadline); release(); engine.stop(); await render.catch(() => {});
  }
}, 15000);
