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

type Stage = 'prepare' | 'think' | 'change' | 'validate' | 'review';

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'prepare', label: 'Prepare' },
  { id: 'think', label: 'Reason' },
  { id: 'change', label: 'Work' },
  { id: 'validate', label: 'Validate' },
  { id: 'review', label: 'Review' },
];

function isTerminal(status: string) {
  return ['completed', 'published', 'rolled_back', 'failed', 'cancelled'].includes(status);
}

export class TaskRunnerPanel extends BaseComponent {
  private panelEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private statusDotEl: HTMLElement | null = null;
  private thinkingEl: HTMLElement | null = null;
  private thinkingLabelEl: HTMLElement | null = null;
  private outputDetails: HTMLDetailsElement | null = null;
  private outputEl: HTMLElement | null = null;
  private resultEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private stageEls = new Map<Stage, HTMLElement>();
  private streamAbort: AbortController | null = null;
  private codexBuffer = '';

  constructor(id: string, state: { prompt: string }) {
    super(id, { prompt: state.prompt, taskId: '', status: 'starting', output: '', changedFiles: [], error: '' } as TaskState);
  }

  draw(container: HTMLElement) {
    const panel = html.take(container).section.className('app-picker-task-panel').ele();
    this.panelEl = panel;

    const header = html.take(panel).div.className('app-picker-task-header').ele();
    const avatar = html.take(header).div.className('app-picker-task-avatar').ele();
    appendIcon(avatar, 'ai');
    const title = html.take(header).div.className('app-picker-task-title').ele();
    html.take(title).div.className('app-picker-task-eyebrow').text('CORE3 AGENT');
    html.take(title).h2.text('Project task');
    const status = html.take(header).div.className('app-picker-task-status').ele();
    this.statusDotEl = html.take(status).span.className('app-picker-task-status-dot').ele();
    this.statusEl = html.take(status).span.className('app-picker-task-status-label').text('Starting').ele();
    const cancel = html.take(header).button.className('app-picker-task-cancel').attr('type', 'button').attr('aria-label', 'Cancel task').ele();
    appendIcon(cancel, 'x');
    cancel.addEventListener('click', () => { void this.cancel(); });

    const prompt = html.take(panel).div.className('app-picker-task-prompt').ele();
    const promptIcon = html.take(prompt).span.className('app-picker-task-prompt-icon').ele();
    appendIcon(promptIcon, 'arrow-right');
    html.take(prompt).p.text(this.state.prompt);

    const timeline = html.take(panel).div.className('app-picker-task-timeline').ele();
    for (const [index, stage] of STAGES.entries()) {
      const item = html.take(timeline).div.className('app-picker-task-stage').dataAttr('task-stage', stage.id).ele();
      const marker = html.take(item).span.className('app-picker-task-stage-marker').ele();
      html.take(marker).span.className('app-picker-task-stage-number').text(String(index + 1));
      html.take(item).span.className('app-picker-task-stage-label').text(stage.label);
      this.stageEls.set(stage.id, item);
    }

    const thinking = html.take(panel).div.className('app-picker-task-thinking').ele();
    const thinkingIcon = html.take(thinking).span.className('app-picker-task-thinking-icon').ele();
    appendIcon(thinkingIcon, 'ai');
    this.thinkingLabelEl = html.take(thinking).span.className('app-picker-task-thinking-label').text('Preparing a workspace').ele();
    const dots = html.take(thinking).span.className('app-picker-task-thinking-dots').ele();
    for (let index = 0; index < 3; index += 1) html.take(dots).span.className('app-picker-task-thinking-dot').ele();
    this.thinkingEl = thinking;

    const details = html.take(panel).add('details').className('app-picker-task-activity').ele() as HTMLDetailsElement;
    details.open = true;
    this.outputDetails = details;
    const summary = html.take(details).add('summary').className('app-picker-task-activity-summary').ele();
    const summaryIcon = html.take(summary).span.className('app-picker-task-activity-icon').ele();
    appendIcon(summaryIcon, 'terminal');
    html.take(summary).span.className('app-picker-task-activity-label').text('Live activity');
    html.take(summary).span.className('app-picker-task-activity-hint').text('click to collapse');
    this.outputEl = html.take(details).add('pre').className('app-picker-task-output').ele();

    this.resultEl = html.take(panel).div.className('app-picker-task-result').ele();
    this.actionsEl = html.take(panel).div.className('app-picker-task-actions').ele();
    this.updateVisualState();
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
      this.updateVisualState();
      await this.stream();
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') this.fail(String((error as Error)?.message || error));
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
    this.flushCodexBuffer();
  }

  private onEvent(event: any) {
    this.state.status = String(event.status || this.state.status);
    if (event.type === 'output') this.appendOutput(String(event.data || ''), event.stream === 'stderr');
    if (event.type === 'complete') {
      this.flushCodexBuffer();
      this.state.changedFiles = Array.isArray(event.data?.changed_files) ? event.data.changed_files : [];
      this.showResult(this.state.status === 'awaiting_approval' ? 'review' : 'complete', this.state.changedFiles.length);
    }
    if (event.type === 'action') this.appendOutput(`\nAction completed: ${String(event.data?.action || 'operation')}\n`, false);
    if (event.type === 'error') this.fail(String(event.data || 'Task failed'));
    this.updateVisualState();
    this.updateActions();
  }

  private appendOutput(value: string, stderr: boolean) {
    if (stderr) {
      this.state.output += value;
      this.renderOutput();
      return;
    }
    this.codexBuffer += value;
    const lines = this.codexBuffer.split('\n');
    this.codexBuffer = lines.pop() || '';
    for (const line of lines) {
      const formatted = this.formatCodexLine(line);
      if (formatted) this.state.output += `${formatted}\n`;
    }
    this.renderOutput();
  }

  private flushCodexBuffer() {
    if (!this.codexBuffer) return;
    const formatted = this.formatCodexLine(this.codexBuffer);
    if (formatted) this.state.output += formatted;
    this.codexBuffer = '';
    this.renderOutput();
  }

  private formatCodexLine(line: string): string {
    const trimmed = line.trim();
    if (!trimmed) return '';
    try {
      const event = JSON.parse(trimmed);
      if (event.type === 'thread.started') return 'Session started';
      if (event.type === 'turn.started') return 'Thinking through the request…';
      if (event.type === 'turn.completed') return 'Reasoning complete';
      if (event.type === 'item.completed') {
        const item = event.item || {};
        if (item.type === 'agent_message' && item.text) return String(item.text);
        if (item.type === 'command_execution') {
          const command = item.command ? `$ ${String(item.command).replace(/\\n/g, ' ')}` : '';
          return [command, item.aggregated_output || ''].filter(Boolean).join('\n');
        }
        if (item.type === 'file_change') return 'Updated project files';
      }
      if (event.type === 'error' || event.error) return String(event.message || event.error);
      return '';
    } catch {
      return line;
    }
  }

  private renderOutput() {
    if (!this.outputEl) return;
    this.outputEl.textContent = this.state.output.trim();
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
    if (this.state.output) this.outputDetails?.classList.add('has-output');
  }

  private updateVisualState() {
    const status = this.state.status;
    const current = status === 'queued' || status === 'starting' ? 0
      : status === 'running' ? 1
      : status === 'validating' ? 3
      : status === 'awaiting_approval' || status === 'approved' ? 4
      : isTerminal(status) ? 4 : 0;
    for (const [index, stage] of STAGES.entries()) {
      const element = this.stageEls.get(stage.id);
      if (!element) continue;
      element.classList.toggle('is-active', index === current && !isTerminal(status));
      element.classList.toggle('is-complete', index < current || (index === 4 && ['awaiting_approval', 'approved', 'published', 'rolled_back'].includes(status)));
      element.classList.toggle('is-error', status === 'failed' && index === current);
    }
    const thinking = ['starting', 'queued', 'running', 'validating'].includes(status);
    this.thinkingEl?.classList.toggle('is-hidden', !thinking);
    if (this.thinkingLabelEl) this.thinkingLabelEl.textContent = status === 'validating'
      ? 'Checking YAML, routes, and permissions'
      : status === 'running' ? 'Working through the request' : 'Preparing a secure workspace';
    if (this.statusEl) this.statusEl.textContent = this.statusLabel(status);
    this.statusDotEl?.classList.toggle('is-busy', thinking);
    this.statusDotEl?.classList.toggle('is-success', ['completed', 'awaiting_approval', 'approved', 'published'].includes(status));
    this.statusDotEl?.classList.toggle('is-error', ['failed', 'cancelled'].includes(status));
    this.panelEl?.classList.toggle('is-finished', !thinking);
  }

  private statusLabel(status: string) {
    return ({ starting: 'Starting', queued: 'Queued', running: 'Working', validating: 'Validating', awaiting_approval: 'Ready for review', approved: 'Approved', published: 'Published', rolled_back: 'Rolled back', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' } as Record<string, string>)[status] || status;
  }

  private showResult(kind: 'review' | 'complete', changedFiles: number) {
    if (!this.resultEl) return;
    this.resultEl.innerHTML = '';
    const icon = html.take(this.resultEl).span.className(`app-picker-task-result-icon ${kind}`).ele();
    appendIcon(icon, kind === 'review' ? 'check' : 'sparkles');
    const copy = html.take(this.resultEl).div.className('app-picker-task-result-copy').ele();
    html.take(copy).strong.text(kind === 'review' ? 'Your review is ready' : 'Task completed');
    html.take(copy).span.text(kind === 'review' ? `${changedFiles} file${changedFiles === 1 ? '' : 's'} changed in the staged workspace.` : 'The requested task completed successfully.');
  }

  private updateActions() {
    if (!this.actionsEl || !this.state.taskId) return;
    this.actionsEl.innerHTML = '';
    const add = (label: string, operation: string, className = '') => {
      const button = html.take(this.actionsEl!).button.className(`app-picker-task-action ${className}`).attr('type', 'button').text(label).ele();
      button.addEventListener('click', () => { void this.transition(operation); });
    };
    if (this.state.status === 'awaiting_approval') add('Approve staged changes', 'approve', 'primary');
    if (this.state.status === 'approved') add('Publish changes', 'publish', 'primary');
    if (this.state.status === 'published') add('Rollback publish', 'rollback', 'danger');
  }

  private async transition(operation: string) {
    const response = await apiFetch(`/api/tasks/${encodeURIComponent(this.state.taskId)}/${operation}`, { method: 'POST' });
    if (!response.ok) {
      this.fail((await response.json().catch(() => ({})))?.error || `Could not ${operation} task`);
      return;
    }
    const task = await response.json();
    this.state.status = String(task.status || this.state.status);
    if (operation === 'publish') this.showResult('complete', this.state.changedFiles.length);
    if (operation === 'rollback') this.showResult('complete', 0);
    this.updateVisualState();
    this.updateActions();
  }

  private fail(message: string) {
    this.state.status = 'failed';
    this.state.error = message;
    if (this.resultEl) {
      this.resultEl.innerHTML = '';
      const icon = html.take(this.resultEl).span.className('app-picker-task-result-icon error').ele();
      appendIcon(icon, 'x');
      const copy = html.take(this.resultEl).div.className('app-picker-task-result-copy').ele();
      html.take(copy).strong.text('Task stopped');
      html.take(copy).span.text(message);
    }
    this.updateVisualState();
  }

  private async cancel() {
    this.streamAbort?.abort();
    if (this.state.taskId) await apiFetch(`/api/tasks/${encodeURIComponent(this.state.taskId)}/cancel`, { method: 'POST' }).catch(() => {});
    this.state.status = 'cancelled';
    this.updateVisualState();
  }

  dispose() {
    this.streamAbort?.abort();
    this.streamAbort = null;
    this.panelEl = null;
    this.statusEl = null;
    this.statusDotEl = null;
    this.thinkingEl = null;
    this.thinkingLabelEl = null;
    this.outputDetails = null;
    this.outputEl = null;
    this.resultEl = null;
    this.actionsEl = null;
    this.stageEls.clear();
    super.dispose();
  }
}
