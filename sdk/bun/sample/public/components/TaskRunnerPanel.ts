import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendIcon } from '@core3/client/components/Icon';
import { apiFetch } from '../app.ts';

type TaskState = {
  prompt: string;
  taskId: string;
  status: string;
  output: string;
  changedFiles: string[];
  error: string;
};

export class TaskRunnerPanel extends BaseComponent {
  private outputEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private resultEl: HTMLElement | null = null;
  private streamAbort: AbortController | null = null;

  constructor(id: string, state: { prompt: string }) {
    super(id, { prompt: state.prompt, taskId: '', status: 'starting', output: '', changedFiles: [], error: '' } as TaskState);
  }

  draw(container: HTMLElement) {
    const panel = html.take(container).section.className('app-picker-task-panel').ele();
    const heading = html.take(panel).div.className('app-picker-task-heading').ele();
    const icon = html.take(heading).span.className('app-picker-task-icon').ele();
    appendIcon(icon, 'terminal');
    const copy = html.take(heading).div.className('app-picker-task-copy').ele();
    html.take(copy).h2.text('Project task');
    html.take(copy).p.text(this.state.prompt);
    const cancel = html.take(heading).button.className('app-picker-task-cancel').attr('type', 'button').text('Cancel').ele();
    cancel.addEventListener('click', () => { void this.cancel(); });
    this.statusEl = html.take(panel).div.className('app-picker-task-status').text('Starting Codex…').ele();
    this.outputEl = html.take(panel).add('pre').className('app-picker-task-output').ele();
    this.resultEl = html.take(panel).div.className('app-picker-task-result').ele();
    void this.start();
  }

  private async start() {
    try {
      const response = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ prompt: this.state.prompt }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Could not start task');
      const task = await response.json();
      this.state.taskId = String(task.id);
      this.state.status = String(task.status || 'queued');
      this.updateStatus();
      await this.stream();
    } catch (error) {
      this.fail(String((error as Error)?.message || error));
    }
  }

  private async stream() {
    this.streamAbort = new AbortController();
    const response = await apiFetch(`/api/tasks/${encodeURIComponent(this.state.taskId)}/events`, { signal: this.streamAbort.signal });
    if (!response.ok || !response.body) throw new Error('Task event stream is unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';
      for (const message of messages) {
        const line = message.split('\n').find((value) => value.startsWith('data: '));
        if (!line) continue;
        this.onEvent(JSON.parse(line.slice(6)));
      }
    }
  }

  private onEvent(event: any) {
    this.state.status = String(event.status || this.state.status);
    if (event.type === 'output') {
      this.state.output += String(event.data || '');
      if (this.outputEl) this.outputEl.textContent = this.state.output;
      this.outputEl?.scrollTo(0, this.outputEl.scrollHeight);
    }
    if (event.type === 'complete') {
      this.state.changedFiles = Array.isArray(event.data?.changed_files) ? event.data.changed_files : [];
      this.resultEl?.replaceChildren(html.take(this.resultEl).strong.text(`Validated. ${this.state.changedFiles.length} file(s) changed in the staged workspace.`).ele());
    }
    if (event.type === 'error') this.fail(String(event.data || 'Task failed'));
    this.updateStatus();
  }

  private updateStatus() {
    if (this.statusEl) this.statusEl.textContent = this.state.status === 'completed'
      ? 'Completed'
      : this.state.status === 'failed' ? 'Failed' : this.state.status === 'cancelled' ? 'Cancelled' : `Codex: ${this.state.status}`;
  }

  private fail(message: string) {
    this.state.status = 'failed';
    this.state.error = message;
    if (this.resultEl) this.resultEl.textContent = message;
    this.updateStatus();
  }

  private async cancel() {
    this.streamAbort?.abort();
    if (this.state.taskId) await apiFetch(`/api/tasks/${encodeURIComponent(this.state.taskId)}/cancel`, { method: 'POST' }).catch(() => {});
    this.state.status = 'cancelled';
    this.updateStatus();
  }

  dispose() {
    this.streamAbort?.abort();
    this.streamAbort = null;
    this.outputEl = null;
    this.statusEl = null;
    this.resultEl = null;
    super.dispose();
  }
}
