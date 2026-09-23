import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgresDatabase } from '@core3/server/database/postgres-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { WorkbookRuntime, validateWorkbookRuntime } from '@core3/server/workbook-runtime';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';

async function worker(hold: 'claim' | 'prepare' | undefined, amount: number) {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'workbook-export-process.ts')], {
    cwd: join(import.meta.dir, '..'), stdout: 'pipe', stderr: 'pipe',
    env: { ...process.env, CORE3_TEST_HOLD_PHASE: hold || '', CORE3_TEST_SOURCE_VALUE: String(amount) },
  });
  let output = '', pending = '', ready!: (port: number) => void;
  const listening = new Promise<number>(resolve => { ready = resolve; });
  const drain = async (stream: ReadableStream<Uint8Array>, findPort: boolean) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true }); output = (output + text).slice(-4000);
      if (findPort) {
        pending += text; const lines = pending.split(/\r?\n/); pending = lines.pop() || '';
        for (const line of lines) { const match = /^EXPORT_WORKER_READY=(\d+)$/.exec(line); if (match) ready(Number(match[1])); }
      }
    }
  };
  const drained = Promise.all([drain(child.stdout, true), drain(child.stderr, false)]);
  const stop = async () => { if (child.exitCode === null) child.kill('SIGKILL'); await child.exited; await drained; };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const port = await Promise.race([listening, child.exited.then(code => { throw new Error(`Worker exited ${code}: ${output}`); }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Worker startup timed out: ${output}`)), 20000); })]);
    const request = async (path: string, body?: any) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Worker HTTP ${response.status}`);
      return response.json();
    };
    const wait = async (field: 'held' | 'done') => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(`Worker exited: ${output}`);
        const status = await request('/status');
        if (status.error) throw new Error(status.error);
        if (status[field]) return;
        if (status.done && field === 'held') throw new Error(`Worker finished without reaching preparation: ${output}`);
        await Bun.sleep(20);
      }
      throw new Error(`Worker did not reach ${field}: ${output}`);
    };
    return { request, wait, stop };
  } catch (error) { await stop(); throw error; }
  finally { clearTimeout(timer); }
}

async function expectArtifact(repository: YamlRepository, artifact: string, kind: string, amount: number) {
  if (kind === 'share') {
    const link = JSON.parse(Buffer.from(artifact, 'base64').toString('utf8'));
    const rows = await repository.query('SELECT workbook_snapshot, revision_id FROM spreadsheet_workbook_shares WHERE id = ?', [link.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].revision_id).toBe(link.revision_id);
    expect(link.token).toHaveLength(43);
    const snapshot = JSON.parse(rows[0].workbook_snapshot);
    expect(snapshot.sheets[0].cells).toMatchObject({ A1: String(amount), B1: String(amount + 1) });
    expect(JSON.stringify(snapshot.sheets[0].cells)).not.toContain('CORE3.VALUE');
  } else if (kind === 'print') {
    const preview = JSON.parse(Buffer.from(artifact, 'base64').toString('utf8'));
    expect(preview.snapshot.sheets[0].cells).toMatchObject({ A1: String(amount), B1: String(amount + 1) });
    expect(JSON.stringify(preview.snapshot.sheets[0].cells)).not.toContain('CORE3.VALUE');
  } else {
    const sheet = readWorkbookXlsx(Buffer.from(artifact, 'base64'), 10000000, 1000)['xl/worksheets/sheet0.xml'];
    expect(sheet).toContain(`<v>${amount}</v>`); expect(sheet).toContain(`<v>${amount + 1}</v>`);
    expect(sheet).not.toContain(`<v>${amount === 41 ? 73 : 41}</v>`);
  }
}

// Requires an explicitly supplied disposable PostgreSQL database.
for (const kind of ['xlsx', 'print', 'share']) for (const scenario of ['preparation after takeover', 'failure before takeover', 'simultaneous claims']) test.skipIf(!process.env.CORE3_TEST_POSTGRES_URL)(`independent ${kind} workers fence ${scenario}`, async () => {
  const obsoleteFailure = scenario === 'failure before takeover';
  const db = PostgresDatabase.open(process.env.CORE3_TEST_POSTGRES_URL!);
  const repository = new YamlRepository(db);
  const root = join(import.meta.dir, '../services/spreadsheet');
  let runtime: WorkbookRuntime | undefined;
  let first: Awaited<ReturnType<typeof worker>> | undefined, second: Awaited<ReturnType<typeof worker>> | undefined;
  try {
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'export_process_migrations', ['schema', 'data']);
    const definition = validateWorkbookRuntime(Bun.YAML.parse(readFileSync(join(root, 'workbooks.yaml'), 'utf8')));
    definition.import_jobs!.poll_ms = definition.export_jobs!.poll_ms = 600000;
    const user = { sub: 'owner', name: 'Owner', company_name: 'Acme', permissions: ['spreadsheet.read', 'spreadsheet.write', 'spreadsheet.export'] };
    runtime = new WorkbookRuntime(definition, repository, {
      async getCurrentUser() { return user; }, async resolveBackgroundUser() { return user; },
      hasPermission: (actor, permission) => actor.permissions.includes(permission),
    });
    const request = async (path: string, body?: any, expectedStatus = 200) => {
      const url = new URL(`http://fixture${definition.endpoint}${path}`);
      const response = (await runtime!.handle(new Request(url, { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}) }), url))!;
      const result = await response.json();
      expect({ status: response.status, ...(response.ok ? {} : { result }) }).toMatchObject({ status: expectedStatus });
      return result;
    };
    const book = await request('', { name: 'Process export', snapshot: { sheets: [{ id: 's', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: { A1: '=CORE3.VALUE("worker_values","amount",1,"{}")', B1: '=A1+1', D1: '="00012"' } }] } }, 201);
    const loaded = await request(`/${book.id}`);
    expect(loaded).toMatchObject({ head_sequence: 0, snapshot_sequence: 0 });
    expect(loaded.snapshot.sheets[0].cells.D1).toBe('="00012"');
    if (scenario === 'preparation after takeover') {
      let base = 'START_REVISION';
      for (let sequence = 1; sequence <= 12; sequence++) {
        const next = `edit-${sequence}`;
        const revision = await request(`/${book.id}/revisions`, { type: 'REMOTE_REVISION', version: 1, clientId: loaded.client.id, serverRevisionId: base, nextRevisionId: next, commands: [{ type: 'UPDATE_CELL', sheetId: 's', col: 2, row: 0, content: String(sequence) }] });
        expect(revision.sequence).toBe(sequence); base = next;
      }
      const history = await request(`/${book.id}/revisions?after=9`);
      expect(history.head_sequence).toBe(12);
      expect(history.data.map((revision: any) => revision.sequence)).toEqual([10, 11, 12]);
    }
    const current = await request(`/${book.id}`);
    const job = await request(`/${book.id}/${kind === 'share' ? 'shares' : kind === 'print' ? 'print' : 'export'}`, kind === 'share' ? { base_revision: current.head_revision_id, background: true } : {}, 202);
    expect(job.kind).toBe(kind);
    if (scenario === 'simultaneous claims') {
      first = await worker('claim', 41); second = await worker('claim', 73);
      await Promise.all([first.request('/run', {}), second.request('/run', {})]);
      await Promise.all([first.wait('held'), second.wait('held')]);
      for (const contender of [first, second]) expect(await contender.request('/status')).toMatchObject({ heldJobId: job.id, sourceReads: 0 });
      await Promise.all([first.request('/release', {}), second.request('/release', {})]);
      await Promise.all([first.wait('done'), second.wait('done')]);
      const states = await Promise.all([first.request('/status'), second.request('/status')]);
      expect(states.map(state => state.sourceReads).sort()).toEqual([0, 1]);
      const [winner] = await repository.query('SELECT state, attempts, artifact_base64, data_pages_read FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
      expect(winner.state).toBe('completed'); expect(Number(winner.attempts)).toBe(1);
      expect(Number(winner.data_pages_read)).toBe(1);
      const amount = states[0].sourceReads === 1 ? 41 : 73;
      await expectArtifact(repository, winner.artifact_base64, kind, amount);
      return;
    }
    first = await worker('prepare', 41); second = await worker(undefined, 73);
    await first.request('/run', {}); await first.wait('held');
    const [original] = await repository.query('SELECT lease_token, attempts, workbook_snapshot FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
    expect(Number(original.attempts)).toBe(1);
    expect(JSON.parse(original.workbook_snapshot).format).toBe('core3-export-input-v1');
    await repository.query('UPDATE spreadsheet_export_jobs SET lease_until = ? WHERE id = ?', [Date.now() - 1, job.id]);
    if (obsoleteFailure) {
      await first.request('/release', { fail: true }); await first.wait('done');
      const [retained] = await repository.query('SELECT state, workbook_snapshot, lease_token FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
      expect(retained).toEqual({ state: 'running', workbook_snapshot: original.workbook_snapshot, lease_token: original.lease_token });
    }
    await second.request('/run', {}); await second.wait('done');
    const [winner] = await repository.query('SELECT state, attempts, lease_token, artifact_base64, required_permissions, data_pages_read FROM spreadsheet_export_jobs WHERE id = ?', [job.id]);
    expect(winner.state).toBe('completed'); expect(Number(winner.attempts)).toBe(2);
    expect(winner.lease_token).not.toBe(original.lease_token);
    expect(JSON.parse(winner.required_permissions)).toEqual(['test.read']);
    expect(Number(winner.data_pages_read)).toBe(1);
    if (!obsoleteFailure) { await first.request('/release', {}); await first.wait('done'); }
    expect((await repository.query('SELECT artifact_base64 FROM spreadsheet_export_jobs WHERE id = ?', [job.id]))[0].artifact_base64).toBe(winner.artifact_base64);
    await expectArtifact(repository, winner.artifact_base64, kind, 73);
  } finally { await first?.stop(); await second?.stop(); runtime?.dispose(); await db.close(); }
}, 60000);
