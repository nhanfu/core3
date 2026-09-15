export type WorkbookRequest = (path: string, init?: RequestInit) => Promise<any>;

/** Durable revision polling. Delivery is ordered by server sequence, including ACKs. */
export class WorkbookTransport {
  private listener?: (message: any) => void;
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  private polling?: Promise<void>;
  private readonly buffered = new Map<number, any>();
  private readonly requests = new AbortController();
  private readonly sends = new Map<string, symbol>();

  constructor(
    private readonly request: WorkbookRequest,
    private sequence: number,
    private readonly disconnected: (message: string) => Error,
    private readonly onStatus: (status: 'saved' | 'saving' | 'offline' | 'denied', message?: string) => void,
    private readonly onRestore?: () => void,
  ) {}

  onNewMessage(_id: string, callback: (message: any) => void) {
    this.listener = callback;
    this.closed = false;
    this.schedule();
  }

  leave(_id?: string) {
    void _id;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.requests.abort();
    this.listener = undefined;
  }

  private schedule() {
    if (this.closed) return;
    this.timer = setTimeout(() => {
      void this.poll().catch(error => this.onStatus(error.status === 401 || error.status === 403 || error.status === 404 ? 'denied' : 'offline', error.message)).finally(() => this.schedule());
    }, 250);
  }

  private deliver(sequence: number, message: any) {
    if (sequence <= this.sequence || this.closed) return;
    this.buffered.set(sequence, message);
    while (this.buffered.has(this.sequence + 1)) {
      const next = this.buffered.get(++this.sequence);
      this.buffered.delete(this.sequence);
      this.sends.delete(next.nextRevisionId);
      if (next.type === 'WORKBOOK_RESTORED') {
        this.leave();
        this.onRestore?.();
        return;
      }
      this.listener?.(next);
    }
  }

  async poll() {
    if (this.closed) return;
    if (this.polling) return this.polling;
    this.polling = (async () => {
      const result = await this.request(`/revisions?after=${this.sequence}`, { signal: this.requests.signal });
      for (const row of result.data) this.deliver(row.sequence, row.message);
    })();
    try { await this.polling; } finally { this.polling = undefined; }
  }

  async sendMessage(message: any): Promise<void> {
    // Presence is not durable document state. WebSocket presence is a separate channel.
    if (['CLIENT_JOINED', 'CLIENT_MOVED', 'CLIENT_LEFT', 'SNAPSHOT'].includes(message.type)) return;
    const attempt = Symbol();
    this.sends.set(message.nextRevisionId, attempt);
    this.onStatus('saving');
    let delay = 250;
    while (!this.closed) {
      // A remote revision can cause the engine to resend a transformed version
      // while an older HTTP attempt is still outstanding. Only the newest retries.
      if (this.sends.get(message.nextRevisionId) !== attempt) return;
      try {
        const result = await this.request('/revisions', { method: 'POST', body: JSON.stringify(message), signal: this.requests.signal });
        this.deliver(result.sequence, result.message);
        if (this.buffered.size) await this.poll();
        this.onStatus('saved');
        return;
      } catch (error: any) {
        if (this.sends.get(message.nextRevisionId) !== attempt) return;
        if (this.closed) throw this.disconnected('Workbook was closed');
        if (error.status === 409 && error.code === 'WORKBOOK_REVISION_CONFLICT') {
          // Missing remote revisions rebase the engine's pending commands. The
          // engine resends its transformed pending revision when it receives them.
          await this.poll();
          return;
        }
        if (error.status && error.status < 500) {
          this.sends.delete(message.nextRevisionId);
          this.onStatus('denied', error.message);
          throw this.disconnected(error.message);
        }
        this.onStatus('offline', 'Connection lost. Unsaved edits remain in this tab.');
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 5000);
      }
    }
    throw this.disconnected('Workbook was closed');
  }
}

export function workbookRequest(endpoint: string, responseType: 'json' | 'bytes' = 'json'): WorkbookRequest {
  if (!endpoint.startsWith('/api/') || endpoint.includes('..') || endpoint.includes('?') || endpoint.includes('#')) throw new Error('Invalid workbook endpoint');
  return async (path, init = {}) => {
    const token = localStorage.getItem('core3_token');
    const response = await fetch(endpoint + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    if (!response.ok) {
      const payload = await response.json();
      throw Object.assign(new Error(payload.error || 'Workbook request failed'), { status: response.status, code: payload.code });
    }
    return responseType === 'bytes' ? new Uint8Array(await response.arrayBuffer()) : response.json();
  };
}
