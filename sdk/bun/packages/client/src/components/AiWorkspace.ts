import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendFilledIcon, appendIcon } from '@core3/client/components/Icon';

type Part = { type: string; [key: string]: any };
type Message = { id?: string; role?: string; text?: string; parts_json?: string; parts?: Part[]; created_at?: string };
type Thread = { id?: string; title?: string; updated_at?: string; preview?: string };

const PENDING_PROMPT_KEY = 'core3_ai_pending_prompt';

export function stageAiPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed) sessionStorage.setItem(PENDING_PROMPT_KEY, trimmed);
}

export function mount(container: HTMLElement) {
  new AiWorkspace('ai-workspace', {}).mount(container);
}

function partsFor(message: Message): Part[] {
  if (Array.isArray(message.parts)) return message.parts;
  if (message.parts_json) {
    try {
      const parsed = JSON.parse(message.parts_json);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* old or malformed messages remain readable as text */ }
  }
  return message.text ? [{ type: 'text', markdown: message.text }] : [];
}

function apiBase() {
  return typeof window !== 'undefined' && window.__CORE3_API_BASE__ ? window.__CORE3_API_BASE__ : '/api';
}

function tokenHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('core3_token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export class AiWorkspace extends BaseComponent {
  def: any;
  private threadList: HTMLElement | null = null;
  private conversation: HTMLElement | null = null;
  private composer: HTMLTextAreaElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private previewPanel: HTMLElement | null = null;
  private currentThreadId: string | null = null;

  constructor(id: string, state: any, def: any = {}) {
    super(id, { threads: [], messages: [], currentUserId: '', ...state });
    this.def = def || {};
  }

  private label(key: string, fallback: string) {
    const value = this.def?.[key];
    return value === undefined || value === null || value === '' ? fallback : String(value);
  }

  private threads(): Thread[] { return Array.isArray(this.state.threads) ? this.state.threads : []; }
  private messages(): Message[] { return Array.isArray(this.state.messages) ? this.state.messages : []; }

  submitPrompt(prompt: string) {
    if (!this.composer) return;
    this.composer.value = prompt;
    void this.send();
  }

  focusComposer() { this.composer?.focus({ preventScroll: true }); }

  draw(container: HTMLElement) {
    const root = html.take(container).section.className('ai-workspace').ele();
    const header = html.take(root).header.className('ai-workspace-header').ele();
    const heading = html.take(header).div.className('ai-workspace-heading').ele();
    const avatar = html.take(heading).span.className('ai-workspace-avatar').ele();
    appendFilledIcon(avatar, 'ai');
    const copy = html.take(heading).div.className('ai-workspace-heading-copy').ele();
    html.take(copy).div.className('app-picker-task-eyebrow').text(this.label('eyebrow', 'CORE3 AGENT'));
    html.take(copy).h1.text(this.label('heading', 'Developer workspace'));
    html.take(copy).p.text(this.label('description', 'Ask about YAML rules and Core3 APIs.'));
    const newThread = html.take(header).button.className('ai-workspace-new').attr('type', 'button').text(this.label('new_thread_label', 'New thread')).ele() as HTMLButtonElement;
    appendIcon(newThread, 'plus');
    newThread.addEventListener('click', () => this.newThread());

    const body = html.take(root).div.className('ai-workspace-body').ele();
    const sidebar = html.take(body).aside.className('ai-workspace-sidebar').ele();
    html.take(sidebar).div.className('ai-workspace-sidebar-title').text(this.label('threads_label', 'Threads'));
    this.threadList = html.take(sidebar).div.className('ai-workspace-thread-list').ele();
    const main = html.take(body).div.className('ai-workspace-main').ele();
    const context = html.take(main).div.className('ai-workspace-context').ele();
    html.take(context).span.className('ai-workspace-context-label').text('Context');
    html.take(context).span.className('ai-workspace-context-value').text(this.label('context_value', 'Core3 YAML project'));
    html.take(context).span.className('ai-workspace-context-divider').text('·');
    html.take(context).span.className('ai-workspace-context-permission').text('Uses your permissions');

    const split = html.take(main).div.className('ai-workspace-split').ele();
    this.conversation = html.take(split).div.className('ai-workspace-conversation').ele();
    this.previewPanel = html.take(split).aside.className('ai-workspace-preview').ele();
    this.renderPreviewEmpty();
    const composerForm = html.take(main).form.className('ai-workspace-composer').ele() as HTMLFormElement;
    const row = html.take(composerForm).div.className('ai-workspace-composer-row').ele();
    this.composer = html.take(row).textarea.attr('rows', '2').attr('placeholder', this.label('composer_placeholder', 'Ask about this project…')).attr('aria-label', 'Message Core3 agent').ele() as HTMLTextAreaElement;
    this.sendButton = html.take(row).button.className('ai-workspace-send').attr('type', 'submit').attr('aria-label', 'Send message').ele() as HTMLButtonElement;
    appendIcon(this.sendButton, 'arrow-right');
    html.take(composerForm).div.className('ai-workspace-composer-hint').text('The agent can read approved YAML and call registered Core3 APIs only.');
    composerForm.addEventListener('submit', (event) => { event.preventDefault(); void this.send(); });
    this.composer.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void this.send(); } });

    this.renderThreadList();
    this.currentThreadId ||= this.threads()[0]?.id || null;
    this.renderConversation();
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) { sessionStorage.removeItem(PENDING_PROMPT_KEY); queueMicrotask(() => this.submitPrompt(pending)); }
  }

  private renderThreadList() {
    if (!this.threadList) return;
    this.threadList.innerHTML = '';
    for (const thread of this.threads()) {
      const item = html.take(this.threadList).button.className(`ai-workspace-thread${thread.id === this.currentThreadId ? ' is-active' : ''}`).attr('type', 'button').ele() as HTMLButtonElement;
      html.take(item).span.className('ai-workspace-thread-title').text(String(thread.title || 'Conversation'));
      html.take(item).span.className('ai-workspace-thread-time').text(this.relativeTime(String(thread.updated_at || '')));
      item.addEventListener('click', async () => {
        this.currentThreadId = String(thread.id || '');
        this.renderThreadList();
        await this.loadMessages();
        this.renderConversation();
      });
    }
    if (!this.threads().length) html.take(this.threadList).p.className('ai-workspace-empty-list').text('No threads yet');
  }

  private async loadMessages() {
    if (typeof this.def?.load_messages === 'function') await this.def.load_messages(this.currentThreadId || '');
  }

  private renderConversation() {
    if (!this.conversation) return;
    this.conversation.innerHTML = '';
    if (!this.currentThreadId) {
      const welcome = html.take(this.conversation).div.className('ai-workspace-welcome').ele();
      const icon = html.take(welcome).span.className('ai-workspace-welcome-icon').ele();
      appendFilledIcon(icon, 'ai');
      html.take(welcome).h2.text(this.label('welcome_title', 'What do you want to understand?'));
      html.take(welcome).p.text(this.label('welcome_description', 'Inspect YAML rules, explain an API flow, or prepare a safe preview.'));
      return;
    }
    const list = html.take(this.conversation).div.className('ai-workspace-message-list').ele();
    for (const message of this.messages()) this.renderMessage(list, message);
    this.conversation.scrollTop = this.conversation.scrollHeight;
  }

  private renderMessage(list: HTMLElement, message: Message) {
    const role = message.role === 'user' ? 'user' : 'assistant';
    const article = html.take(list).article.className(`ai-workspace-message is-${role}`).ele();
    html.take(article).div.className('ai-workspace-message-role').text(role === 'user' ? 'You' : 'Core3');
    for (const part of partsFor(message)) this.renderPart(article, part);
  }

  private renderPart(target: HTMLElement, part: Part) {
    if (part.type === 'text') {
      for (const paragraph of String(part.markdown || '').split(/\n\s*\n/).filter(Boolean)) html.take(target).p.className('ai-workspace-message-text').text(paragraph);
    } else if (part.type === 'activity') {
      html.take(target).div.className(`ai-workspace-activity-row is-${part.status}`).text(`${part.status === 'success' ? '✓' : part.status === 'failed' ? '!' : '·'} ${String(part.label || '')}`);
    } else if (part.type === 'preview') {
      const card = html.take(target).section.className('ai-workspace-preview-card').ele();
      html.take(card).h3.text(String(part.title || 'Preview ready'));
      const summary = part.summary || {};
      for (const [key, value] of Object.entries(summary)) html.take(card).div.className('ai-workspace-preview-stat').text(`${key}: ${String(value)}`);
      if (part.preview_id) html.take(card).button.className('ai-workspace-preview-open').attr('type', 'button').text('Open preview').event('click', () => this.showPreview(part));
    } else if (part.type === 'approval') {
      const card = html.take(target).section.className('ai-workspace-approval-card').ele();
      html.take(card).strong.text('Approval required');
      html.take(card).p.text(String(part.warning || 'This operation will call a Core3 API using your permissions.'));
      html.take(card).button.className('ai-workspace-approve').attr('type', 'button').text(String(part.action_label || 'Confirm')).event('click', () => void this.confirm(String(part.preview_id)));
    } else if (part.type === 'result') {
      const card = html.take(target).section.className('ai-workspace-result-card').ele();
      html.take(card).strong.text(String(part.title || 'Completed'));
      const summary = part.summary || {};
      const rows = Array.isArray(summary.data) ? summary.data.filter((row: any) => row && typeof row === 'object') : [];
      if (rows.length) {
        const columns: string[] = [...new Set<string>(rows.flatMap((row: any) => Object.keys(row)))].slice(0, 12);
        const table = html.take(card).table.className('ai-workspace-result-table').ele();
        const head = html.take(table).thead.trow.ele();
        for (const column of columns) html.take(head).th.text(column);
        const body = html.take(table).tbody.ele();
        for (const row of rows.slice(0, 50)) {
          const tr = html.take(body).trow.ele();
          for (const column of columns) html.take(tr).tdata.text(String(row[column] ?? ''));
        }
      } else {
        for (const [key, value] of Object.entries(summary)) html.take(card).div.text(`${key}: ${String(value)}`);
      }
    } else if (part.type === 'technical_details') {
      const details = html.take(target).details.className('ai-workspace-technical-details').ele();
      html.take(details).summary.text('Technical details');
      html.take(details).div.className('ai-workspace-technical-json').text(JSON.stringify({ operation: part.operation, request: part.request, response: part.response }, null, 2));
    }
  }

  private showPreview(part: Part) {
    if (!this.previewPanel) return;
    const canvas = this.openPreviewSurface(String(part.title || part.page || 'Preview'));
    const previewPage = part.page || this.def?.preview_page;
    if (previewPage && typeof this.def?.mount_preview_page === 'function') {
      void this.def.mount_preview_page(String(previewPage), canvas, part.context || {}).catch((error: any) => {
        html.take(canvas).p.className('ai-workspace-preview-error').text(String(error?.message || error));
      });
      return;
    }
    html.take(canvas).p.className('ai-workspace-preview-copy').text('This preview is rendered from the agent result. A YAML page can provide the detailed view without granting automatic mutation access.');
    for (const [key, value] of Object.entries(part.summary || {})) html.take(canvas).div.className('ai-workspace-preview-line').text(`${key}: ${String(value)}`);
  }

  private renderPreviewEmpty() {
    if (!this.previewPanel) return;
    this.previewPanel.innerHTML = '';
    const header = html.take(this.previewPanel).div.className('ai-workspace-preview-toolbar').ele();
    const heading = html.take(header).div.className('ai-workspace-preview-toolbar-heading').ele();
    html.take(heading).span.className('ai-workspace-preview-kicker').text('PREVIEW');
    html.take(heading).strong.className('ai-workspace-preview-title').text('No preview selected');
    html.take(header).span.className('ai-workspace-preview-readonly').text('Read-only');
    const empty = html.take(this.previewPanel).div.className('ai-workspace-preview-empty').ele();
    html.take(empty).div.className('ai-workspace-preview-empty-icon').text('◈');
    html.take(empty).strong.text('Review a result here');
    html.take(empty).p.text('Ask the agent to open a page or prepare a preview. The full YAML screen will appear in this panel.');
  }

  private openPreviewSurface(title: string) {
    if (!this.previewPanel) return document.createElement('div');
    this.previewPanel.innerHTML = '';
    const header = html.take(this.previewPanel).div.className('ai-workspace-preview-toolbar').ele();
    const heading = html.take(header).div.className('ai-workspace-preview-toolbar-heading').ele();
    html.take(heading).span.className('ai-workspace-preview-kicker').text('PREVIEW');
    html.take(heading).strong.className('ai-workspace-preview-title').text(title);
    html.take(header).span.className('ai-workspace-preview-readonly').text('Read-only');
    const close = html.take(header).button.className('ai-workspace-preview-close').attr('type', 'button').text('Close').ele() as HTMLButtonElement;
    close.addEventListener('click', () => this.renderPreviewEmpty());
    const canvas = html.take(this.previewPanel).div.className('ai-workspace-preview-canvas').ele();
    return canvas;
  }

  private async send() {
    const prompt = this.composer?.value.trim() || '';
    if (!prompt || !this.sendButton) return;
    this.sendButton.disabled = true;
    try {
      let threadId = this.currentThreadId;
      if (!threadId) {
        const created = await this.runAction('create_thread_action', { title: prompt.slice(0, 120) });
        threadId = String(created?.thread_id || created?.id || '');
        this.currentThreadId = threadId;
      }
      await this.runAction('send_action', { thread_id: threadId, prompt });
      const response = await fetch(`${apiBase()}/ai/agent`, { method: 'POST', headers: tokenHeaders(), body: JSON.stringify({ thread_id: threadId, prompt }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(result?.error || 'Agent request failed'));
      const parts = Array.isArray(result?.parts) ? result.parts : [{ type: 'text', markdown: 'The agent returned no readable response.' }];
      const text = parts.filter((part: Part) => part.type === 'text').map((part: Part) => part.markdown).join('\n\n') || 'Action prepared.';
      await this.runAction('save_assistant_action', { thread_id: threadId, text, parts_json: JSON.stringify(parts) });
      if (this.composer) this.composer.value = '';
      await this.def?.refresh?.();
      await this.loadMessages();
      this.renderThreadList();
      this.renderConversation();
    } catch (error) {
      if (this.conversation) html.take(this.conversation).div.className('ai-workspace-send-error').text(String((error as Error).message || error));
    } finally {
      this.sendButton.disabled = false;
      this.composer?.focus();
    }
  }

  private async confirm(previewId: string) {
    const response = await fetch(`${apiBase()}/ai/agent/confirm`, { method: 'POST', headers: tokenHeaders(), body: JSON.stringify({ preview_id: previewId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(result?.error || 'Confirmation failed'));
    const parts = Array.isArray(result?.parts) ? result.parts : [];
    for (const part of parts) this.renderPart(this.conversation!, part);
  }

  private async runAction(key: string, values: Record<string, unknown>) {
    const actionId = String(this.def?.[key] || '');
    if (!actionId || typeof this.def?.run_action !== 'function') throw new Error(`AI action is not configured: ${key}`);
    return this.def.run_action(actionId, values);
  }

  private newThread() { this.currentThreadId = null; this.renderThreadList(); this.renderConversation(); this.composer?.focus(); }

  private relativeTime(value: string) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) return '';
    const age = Math.max(0, Date.now() - time);
    if (age < 60_000) return 'now';
    if (age < 3_600_000) return `${Math.floor(age / 60_000)}m`;
    if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  dispose() {
    this.threadList = null;
    this.conversation = null;
    this.previewPanel = null;
    this.composer = null;
    this.sendButton = null;
    super.dispose();
  }
}
