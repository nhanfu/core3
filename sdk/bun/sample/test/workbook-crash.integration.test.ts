import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readWorkbookXlsx } from '@core3/client/spreadsheet/files';

async function startServer(database: string, resumeJobs = false) {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'workbook-crash-process.ts'), database, resumeJobs ? 'resume-jobs' : 'pause-jobs'], {
    cwd: join(import.meta.dir, '..'), stdout: 'pipe', stderr: 'pipe',
  });
  let output = '', pending = '';
  let ready!: (port: number) => void;
  const listening = new Promise<number>(resolve => { ready = resolve; });
  let reachedBarrier!: (phase: string) => void;
  const barrier = new Promise<string>(resolve => { reachedBarrier = resolve; });
  const drain = async (stream: ReadableStream<Uint8Array>, findPort: boolean) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      const text = decoder.decode(chunk, { stream: true });
      output = (output + text).slice(-6000);
      if (findPort) {
        pending += text;
        const lines = pending.split(/\r?\n/); pending = lines.pop() || '';
        for (const line of lines) {
          const match = /^CRASH_TEST_READY=(\d+)$/.exec(line); if (match) ready(Number(match[1]));
          const crash = /^CRASH_TEST_BARRIER=(before|after)$/.exec(line); if (crash) reachedBarrier(crash[1]);
        }
      }
    }
  };
  const drained = Promise.all([drain(child.stdout, true), drain(child.stderr, false)]);
  const stop = async () => {
    if (child.exitCode === null) child.kill('SIGKILL');
    await child.exited; await drained;
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const port = await Promise.race([
      listening,
      child.exited.then(code => { throw new Error(`Crash-test server exited ${code}: ${output}`); }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Crash-test startup timed out: ${output}`)), 20000); }),
    ]);
    const request = (path = '', method = 'GET', body?: any) => fetch(`http://127.0.0.1:${port}/api/spreadsheet/workbooks${path}`, {
      method, headers: { Authorization: 'Bearer crash-test-owner', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
    });
    const waitForBarrier = async () => {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          barrier,
          child.exited.then(code => { throw new Error(`Server exited before crash barrier: ${code}: ${output}`); }),
          new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error(`Crash barrier timed out: ${output}`)), 20000); }),
        ]);
      } finally { clearTimeout(deadline); }
    };
    return { request, stop, child, waitForBarrier };
  } catch (error) { await stop(); throw error; }
  finally { clearTimeout(timer); }
}

test('recovers acknowledged edits and queued exports after abrupt server process termination', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'core3-workbook-crash-'));
  const database = join(directory, 'workbooks.duckdb');
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  const clientId = `${createHash('sha256').update('owner').digest('hex')}-crash-test`;
  const revision = (previous: string, next: string, col: number, content: string) => ({
    type: 'REMOTE_REVISION', version: 1, clientId, serverRevisionId: previous, nextRevisionId: next,
    commands: [{ type: 'UPDATE_CELL', sheetId: 'sheet-1', col, row: 0, content }],
  });
  try {
    server = await startServer(database);
    const created = await server.request('', 'POST', { name: 'Crash recovery budget' });
    expect(created.status).toBe(201);
    const book = await created.json(), path = `/${book.id}`;
    expect((await server.request(`${path}/revisions`, 'POST', revision('START_REVISION', 'ack-one', 0, '21'))).status).toBe(200);
    expect((await server.request(`${path}/revisions`, 'POST', revision('ack-one', 'ack-two', 1, '=A1*2'))).status).toBe(200);
    const prepared = await server.request(`${path}/export`, 'POST');
    expect(prepared.status).toBe(202);
    const job = await prepared.json();
    expect(job.state).toBe('queued');
    await server.stop();
    expect(server.child.exitCode).not.toBe(0);

    server = await startServer(database, true);
    const reopened = await (await server.request(path)).json();
    expect(reopened.head_revision_id).toBe('ack-two');
    expect(reopened.head_sequence).toBe(2);
    expect(reopened.revisions.map((entry: any) => entry.nextRevisionId)).toEqual(['ack-one', 'ack-two']);
    const deadline = Date.now() + 20000;
    let result: any;
    do {
      const response = await server.request(`/exports/${job.id}`);
      expect(response.status).toBe(200); result = await response.json();
      if (['completed', 'failed', 'cancelled'].includes(result.state)) break;
      await Bun.sleep(50);
    } while (Date.now() < deadline);
    expect(result).toMatchObject({ state: 'completed', attempts: 1, revision_id: 'ack-two' });
    expect((await server.request(`${path}/revisions`, 'POST', revision('ack-two', 'ack-three', 0, '99'))).status).toBe(200);
    await server.stop();
    expect(server.child.exitCode).not.toBe(0);

    // Jobs are paused on this restart: the artifact must already be durable.
    server = await startServer(database);
    const afterSecondCrash = await (await server.request(path)).json();
    expect(afterSecondCrash.head_revision_id).toBe('ack-three');
    expect(afterSecondCrash.head_sequence).toBe(3);
    const artifact = await server.request(`/exports/${job.id}?download=true`);
    expect(artifact.status).toBe(200);
    expect(artifact.headers.get('X-Workbook-Revision')).toBe('ack-two');
    const parts = readWorkbookXlsx(new Uint8Array(await artifact.arrayBuffer()), 10000000, 1000);
    expect(parts['xl/worksheets/sheet0.xml']).toContain('A1*2');
    expect(parts['xl/worksheets/sheet0.xml']).toContain('<v>42</v>');
    expect(parts['xl/worksheets/sheet0.xml']).not.toContain('<v>198</v>');
    expect(await (await server.request(`/exports/${job.id}`)).json()).toMatchObject({ state: 'completed', attempts: 1 });
  } finally {
    await server?.stop();
    rmSync(directory, { recursive: true, force: true });
  }
}, 60000); // Process startup, forced termination and WAL recovery, not a performance gate.

for (const phase of ['before', 'after'] as const) test(`recovers and safely retries a revision killed ${phase} database commit without an HTTP acknowledgement`, async () => {
  const directory = mkdtempSync(join(tmpdir(), `core3-workbook-${phase}-commit-`));
  const database = join(directory, 'workbooks.duckdb');
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  const clientId = `${createHash('sha256').update('owner').digest('hex')}-commit-crash`;
  const revision = (previous: string, next: string, content: string) => ({
    type: 'REMOTE_REVISION', version: 1, clientId, serverRevisionId: previous, nextRevisionId: next,
    commands: [{ type: 'UPDATE_CELL', sheetId: 'sheet-1', col: 0, row: 0, content }],
  });
  try {
    server = await startServer(database);
    const created = await server.request('', 'POST', { name: 'Atomic revision recovery' });
    expect(created.status).toBe(201);
    const book = await created.json(), path = `/${book.id}`;
    expect((await server.request(`${path}/revisions`, 'POST', revision('START_REVISION', 'base', '21'))).status).toBe(200);
    expect((await server.request('/__crash_barrier', 'POST', { phase })).status).toBe(200);
    const uncertain = revision('base', 'uncertain', '99');
    let responseReceived = false;
    const pending = server.request(`${path}/revisions`, 'POST', uncertain).then(response => { responseReceived = true; return response; }, () => null);
    expect(await server.waitForBarrier()).toBe(phase);
    expect(responseReceived).toBe(false);
    expect(server.child.exitCode).toBeNull();
    await server.stop();
    expect(await pending).toBeNull();

    server = await startServer(database);
    const recovered = await (await server.request(path)).json();
    expect(recovered.head_revision_id).toBe(phase === 'before' ? 'base' : 'uncertain');
    expect(recovered.head_sequence).toBe(phase === 'before' ? 1 : 2);
    expect(recovered.revisions.map((entry: any) => entry.nextRevisionId)).toEqual(phase === 'before' ? ['base'] : ['base', 'uncertain']);
    const retry = await server.request(`${path}/revisions`, 'POST', uncertain);
    expect(retry.status).toBe(200);
    const ack = await retry.json();
    expect(ack.sequence).toBe(2);
    expect(!!ack.replayed).toBe(phase === 'after');
    const final = await (await server.request(path)).json();
    expect(final.head_revision_id).toBe('uncertain');
    expect(final.head_sequence).toBe(2);
    expect(final.revisions.map((entry: any) => entry.nextRevisionId)).toEqual(['base', 'uncertain']);
    expect((await server.request(`${path}/revisions`, 'POST', revision('base', 'uncertain', 'corrupted retry'))).status).toBe(409);
    const file = await server.request(`${path}/export`);
    expect(file.status).toBe(200);
    const parts = readWorkbookXlsx(new Uint8Array(await file.arrayBuffer()), 10000000, 1000);
    expect(parts['xl/worksheets/sheet0.xml']).toContain('<v>99</v>');
  } finally { await server?.stop(); rmSync(directory, { recursive: true, force: true }); }
}, 60000);
