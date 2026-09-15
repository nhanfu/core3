import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkbookTransport } from '../../src/spreadsheet/WorkbookTransport';

afterEach(() => vi.useRealTimers());
const message = (id: string, base = 'START_REVISION') => ({ type: 'REMOTE_REVISION', nextRevisionId: id, serverRevisionId: base, commands: [] });

describe('Workbook ordered transport', () => {
  it('fills sequence gaps before acknowledging a later local revision', async () => {
    const events: any[] = [];
    const request = vi.fn(async (path: string) => path === '/revisions'
      ? { sequence: 2, message: message('local', 'remote') }
      : { data: [{ sequence: 1, message: message('remote') }, { sequence: 2, message: message('local', 'remote') }] });
    const transport = new WorkbookTransport(request, 0, text => new Error(text), () => {});
    transport.onNewMessage('client', value => events.push(value));
    try {
      await transport.sendMessage(message('local'));
      expect(events.map(event => event.nextRevisionId)).toEqual(['remote', 'local']);
      await transport.poll();
      expect(events).toHaveLength(2);
    } finally { transport.leave(); }
  });

  it('does not retry an obsolete request after the engine rebases and saves it', async () => {
    let rejectOriginal!: (error: Error) => void;
    let rebased!: Promise<void>;
    let posts = 0;
    const request = vi.fn(async (path: string) => {
      if (path.startsWith('/revisions?')) return { data: [{ sequence: 1, message: message('remote') }] };
      if (++posts === 1) return new Promise((_resolve, reject) => { rejectOriginal = reject; });
      return { sequence: 2, message: message('local', 'remote') };
    });
    const statuses: string[] = [];
    const transport = new WorkbookTransport(request, 0, text => new Error(text), status => statuses.push(status));
    transport.onNewMessage('client', event => {
      if (event.nextRevisionId === 'remote') rebased = transport.sendMessage(message('local', 'remote'));
    });
    try {
      const original = transport.sendMessage(message('local'));
      await transport.poll();
      await rebased;
      rejectOriginal(new TypeError('Connection lost after a newer attempt succeeded'));
      await original;
      expect(posts).toBe(2);
      expect(statuses).not.toContain('offline');
    } finally { transport.leave(); }
  });

  it('retries transient failures with the same revision ID and refuses permanent denial', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const request = vi.fn(async () => {
      if (++attempts === 1) throw new TypeError('Offline');
      return { sequence: 1, message: message('retry') };
    });
    const status = vi.fn();
    const transport = new WorkbookTransport(request, 0, text => new Error(text), status);
    try {
      const send = transport.sendMessage(message('retry'));
      await vi.advanceTimersByTimeAsync(300);
      await send;
      expect(request).toHaveBeenCalledTimes(2);
      expect(status).toHaveBeenCalledWith('offline', expect.any(String));
    } finally { transport.leave(); }
    const denied = new WorkbookTransport(async () => { throw Object.assign(new Error('Access revoked'), { status: 403 }); }, 0, text => new Error(text), status);
    await expect(denied.sendMessage(message('denied'))).rejects.toThrow('Access revoked');
    expect(status).toHaveBeenCalledWith('denied', 'Access revoked');
    denied.leave();
  });
});
