import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendFilledIcon, appendIcon } from '@core3/client/components/Icon';
import { apiFetch } from '../app.ts';
import { TaskRunnerPanel } from './TaskRunnerPanel.ts';

type AiMessage = { role: 'user' | 'assistant' | 'system'; text: string; taskId?: string; createdAt?: string };
type AiThread = { id: string; title: string; updatedAt: string; messages: AiMessage[]; taskIds: string[]; tasks?: any[] };
type AccessMode = 'ask' | 'full_access';

const PENDING_PROMPT_KEY = 'core3_ai_pending_prompt';

export function stageAiPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed) sessionStorage.setItem(PENDING_PROMPT_KEY, trimmed);
}

export function mount(container: HTMLElement) {
  const workspace = new AiWorkspace('ai-workspace', {});
  workspace.mount(container);
  const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
  if (!pending) return;
  sessionStorage.removeItem(PENDING_PROMPT_KEY);
  workspace.submitPrompt(pending);
}

export class AiWorkspace extends BaseComponent {
  private threadList: HTMLElement | null = null;
  private conversation: HTMLElement | null = null;
  private composer: HTMLTextAreaElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private activity: HTMLElement | null = null;
  private accessSelect: HTMLSelectElement | null = null;
  private modelSelect: HTMLSelectElement | null = null;
  private reasoningSelect: HTMLSelectElement | null = null;
  private contextModeEl: HTMLElement | null = null;
  private contextPermissionEl: HTMLElement | null = null;
  private current: AiThread | null = null;
  private taskPanel: TaskRunnerPanel | null = null;

  submitPrompt(prompt: string) {
    if (!this.composer) return;
    this.composer.value = prompt;
    void this.send();
  }

  focusComposer() {
    this.composer?.focus({ preventScroll: true });
  }

  draw(container: HTMLElement) {
    const root = html.take(container).section.className('ai-workspace').ele();
    const header = html.take(root).div.className('ai-workspace-header').ele();
    const heading = html.take(header).div.className('ai-workspace-heading').ele();
    const avatar = html.take(heading).span.className('ai-workspace-avatar').ele();
    appendFilledIcon(avatar, 'ai');
    const copy = html.take(heading).div.className('ai-workspace-heading-copy').ele();
    html.take(copy).div.className('app-picker-task-eyebrow').text('CORE3 AGENT');
    html.take(copy).h1.text('Project workspace');
    html.take(copy).p.text('Plan, change, and review your YAML-driven project.');
    const newThread = html.take(header).button.className('ai-workspace-new').attr('type', 'button').text('New thread').ele();
    appendIcon(newThread, 'plus');
    newThread.addEventListener('click', () => this.newThread());

    const body = document.createElement('div');
    body.className = 'ai-workspace-body';
    root.appendChild(body);
    const sidebar = html.take(body).aside.className('ai-workspace-sidebar').ele();
    const sidebarTitle = html.take(sidebar).div.className('ai-workspace-sidebar-title').ele();
    html.take(sidebarTitle).span.text('Threads');
    this.threadList = html.take(sidebar).div.className('ai-workspace-thread-list').ele();
    const main = document.createElement('main');
    main.className = 'ai-workspace-main';
    body.appendChild(main);
    const context = html.take(main).div.className('ai-workspace-context').ele();
    html.take(context).span.className('ai-workspace-context-label').text('Context');
    html.take(context).span.className('ai-workspace-context-value').text('core3 project');
    html.take(context).span.className('ai-workspace-context-divider').text('·');
    this.contextModeEl = html.take(context).span.className('ai-workspace-context-value').text('ask for approval').ele();
    html.take(context).span.className('ai-workspace-context-divider').text('·');
    this.contextPermissionEl = html.take(context).span.className('ai-workspace-context-permission').text('approval required').ele();
    this.conversation = html.take(main).div.className('ai-workspace-conversation').ele();
    this.activity = html.take(this.conversation).div.className('ai-workspace-activity').ele();
    const composer = html.take(main).form.className('ai-workspace-composer').ele() as HTMLFormElement;
    const composerRow = html.take(composer).div.className('ai-workspace-composer-row').ele();
    this.composer = html.take(composerRow).textarea
      .attr('rows', '2').attr('placeholder', 'Ask Core3 to change the project…')
      .attr('aria-label', 'Message Core3 project agent').ele() as HTMLTextAreaElement;
    this.sendButton = html.take(composerRow).button.className('ai-workspace-send').attr('type', 'submit').ele() as HTMLButtonElement;
    appendIcon(this.sendButton, 'arrow-right');
    const controls = html.take(composer).div.className('ai-workspace-composer-controls').ele();
    this.accessSelect = this.addSelect(controls, 'Access', [
      ['ask', 'Ask for approval'],
      ['full_access', 'Full access'],
    ], 'ask');
    this.modelSelect = this.addSelect(controls, 'Model', [
      ['gpt-5.6-luna', 'GPT-5.6 Luna'],
      ['gpt-5.3-codex', 'GPT-5.3 Codex'],
      ['gpt-5.2-codex', 'GPT-5.2 Codex'],
      ['codex-mini-latest', 'Codex mini'],
    ], 'gpt-5.6-luna');
    this.reasoningSelect = this.addSelect(controls, 'Reasoning', [
      ['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high'], ['max', 'Max'],
    ], 'medium');
    this.accessSelect.addEventListener('change', () => this.updateContext());
    this.updateContext();
    html.take(composer).div.className('ai-workspace-composer-hint').text('Changes stay in the staged workspace until you approve publishing.');
    composer.addEventListener('submit', (event) => { event.preventDefault(); void this.send(); });
    this.composer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void this.send(); }
    });
    void this.loadThreads();
  }

  private async loadThreads() {
    const response = await apiFetch('/api/ai/threads');
    if (!response.ok) return;
    const threads = await response.json() as AiThread[];
    this.renderThreadList(threads);
    if (threads.length) await this.openThread(threads[0].id);
    else this.renderWelcome();
  }

  private renderThreadList(threads: AiThread[]) {
    if (!this.threadList) return;
    this.threadList.innerHTML = '';
    if (!threads.length) {
      html.take(this.threadList).p.className('ai-workspace-empty-list').text('No threads yet');
      return;
    }
    for (const thread of threads) {
      const item = html.take(this.threadList).button.className(`ai-workspace-thread${this.current?.id === thread.id ? ' is-active' : ''}`).attr('type', 'button').ele();
      item.dataset.threadId = thread.id;
      html.take(item).span.className('ai-workspace-thread-title').text(thread.title);
      html.take(item).span.className('ai-workspace-thread-time').text(this.relativeTime(thread.updatedAt));
      item.addEventListener('click', () => { void this.openThread(thread.id); });
    }
  }

  private async openThread(threadId: string) {
    const response = await apiFetch(`/api/ai/threads/${encodeURIComponent(threadId)}`);
    if (!response.ok) return;
    this.current = await response.json() as AiThread;
    this.renderThread(this.current);
    const latestTask = this.current.tasks?.at(-1);
    if (latestTask && this.activity) {
      this.taskPanel?.dispose();
      this.taskPanel = this.mountChild(new TaskRunnerPanel(`ai-task-${latestTask.id}`, { prompt: latestTask.prompt, taskId: latestTask.id }), this.activity);
    }
    this.threadList?.querySelectorAll('.ai-workspace-thread').forEach((item) => item.classList.toggle('is-active', (item as HTMLElement).dataset.threadId === threadId));
  }

  private renderThread(thread: AiThread) {
    if (!this.conversation || !this.activity) return;
    this.taskPanel?.dispose();
    this.taskPanel = null;
    this.conversation.innerHTML = '';
    this.activity.innerHTML = '';
    const messages = html.take(this.conversation).div.className('ai-workspace-message-list').ele();
    for (const message of thread.messages) {
      const bubble = html.take(messages).div.className(`ai-workspace-message is-${message.role}`).ele();
      html.take(bubble).div.className('ai-workspace-message-role').text(message.role === 'user' ? 'You' : 'Core3');
      html.take(bubble).div.className('ai-workspace-message-text').text(message.text);
    }
    const latestTask = thread.tasks?.at(-1);
    if (latestTask) this.renderPlan(this.conversation, latestTask);
    this.conversation.appendChild(this.activity);
    this.threadList?.querySelectorAll('.ai-workspace-thread').forEach((item) => item.classList.remove('is-active'));
  }

  private renderWelcome() {
    if (!this.conversation || !this.activity) return;
    this.conversation.innerHTML = '';
    const welcome = html.take(this.conversation).div.className('ai-workspace-welcome').ele();
    const icon = html.take(welcome).span.className('ai-workspace-welcome-icon').ele();
    appendFilledIcon(icon, 'ai');
    html.take(welcome).h2.text('What should we build?');
    html.take(welcome).p.text('Ask Core3 to inspect, create, or improve a service. Changes begin in a staged workspace.');
    const suggestions = html.take(welcome).div.className('ai-workspace-suggestions').ele();
    for (const suggestion of ['Inspect this project', 'Create a dashboard', 'Explain the service structure']) {
      const button = html.take(suggestions).button.className('ai-workspace-suggestion').attr('type', 'button').text(suggestion).ele();
      button.addEventListener('click', () => this.submitPrompt(suggestion));
    }
    this.conversation.appendChild(this.activity);
  }

  private renderPlan(target: HTMLElement, task: any) {
    const status = String(task.status || 'queued');
    const plan = html.take(target).div.className('ai-workspace-plan').ele();
    const planHeader = html.take(plan).div.className('ai-workspace-plan-header').ele();
    const planIcon = html.take(planHeader).span.className('ai-workspace-plan-icon').ele();
    appendIcon(planIcon, 'sparkles');
    html.take(planHeader).strong.text('Agent plan');
    html.take(planHeader).span.className('ai-workspace-plan-mode').text(`${task.accessMode === 'full_access' ? 'full access' : 'ask for approval'} · ${task.model || 'gpt-5.6-luna'} · ${task.reasoning || 'medium'}`);
    const steps = html.take(plan).div.className('ai-workspace-plan-steps').ele();
    const current = status === 'queued' ? 0 : status === 'running' ? 1 : status === 'validating' ? 2 : ['awaiting_approval', 'approved'].includes(status) ? 3 : 4;
    for (const [index, label] of ['Inspect project context', 'Make the requested changes', 'Validate YAML and routes', 'Prepare the review', 'Publish only after approval'].entries()) {
      const step = html.take(steps).div.className(`ai-workspace-plan-step${index < current ? ' is-complete' : index === current ? ' is-active' : ''}`).ele();
      const marker = html.take(step).span.className('ai-workspace-plan-marker').ele();
      if (index < current) appendIcon(marker, 'check');
      else html.take(marker).text(String(index + 1));
      html.take(step).span.text(label);
    }
  }

  private addSelect(target: HTMLElement, label: string, options: Array<[string, string]>, value: string) {
    const field = html.take(target).label.className('ai-workspace-control').ele();
    html.take(field).span.text(label);
    const select = html.take(field).select.ele() as HTMLSelectElement;
    for (const [optionValue, optionLabel] of options) html.take(select).option.attr('value', optionValue).text(optionLabel);
    select.value = value;
    return select;
  }

  private updateContext() {
    const fullAccess = this.accessSelect?.value === 'full_access';
    if (this.contextModeEl) this.contextModeEl.textContent = fullAccess ? 'full access' : 'ask for approval';
    if (this.contextPermissionEl) this.contextPermissionEl.textContent = fullAccess ? 'publish permission required' : 'approval required';
  }

  private async newThread() {
    this.current = null;
    this.taskPanel?.dispose();
    this.taskPanel = null;
    if (this.activity) this.activity.innerHTML = '';
    this.renderWelcome();
    this.threadList?.querySelectorAll('.ai-workspace-thread').forEach((item) => item.classList.remove('is-active'));
    this.composer?.focus();
  }

  private async send() {
    const prompt = this.composer?.value.trim() || '';
    if (!prompt || !this.sendButton) return;
    this.sendButton.disabled = true;
    try {
      if (!this.current) {
        const created = await apiFetch('/api/ai/threads', { method: 'POST', body: JSON.stringify({ title: prompt }) });
        if (!created.ok) throw new Error('Could not create thread');
        this.current = await created.json() as AiThread;
      }
      const response = await apiFetch(`/api/ai/threads/${encodeURIComponent(this.current.id)}/messages`, {
        method: 'POST', body: JSON.stringify({
          prompt,
          mode: this.accessSelect?.value === 'full_access' ? 'live' : 'staged',
          access_mode: (this.accessSelect?.value || 'ask') as AccessMode,
          model: this.modelSelect?.value || 'gpt-5.6-luna',
          reasoning: this.reasoningSelect?.value || 'medium',
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Could not start task');
      const result = await response.json();
      this.current = result.thread;
      if (this.composer) this.composer.value = '';
      this.renderThread(this.current);
      if (this.activity) this.taskPanel = this.mountChild(new TaskRunnerPanel(`ai-task-${result.task.id}`, { prompt, taskId: result.task.id }), this.activity);
      await this.loadThreadListOnly();
    } catch (error) {
      if (this.activity) html.take(this.activity).div.className('ai-workspace-send-error').text(String((error as Error).message || error));
    } finally {
      this.sendButton.disabled = false;
      this.composer?.focus();
    }
  }

  private async loadThreadListOnly() {
    const response = await apiFetch('/api/ai/threads');
    if (response.ok) this.renderThreadList(await response.json());
  }

  private relativeTime(value: string) {
    const age = Math.max(0, Date.now() - Date.parse(value));
    if (age < 60_000) return 'now';
    if (age < 3_600_000) return `${Math.floor(age / 60_000)}m`;
    if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  dispose() {
    this.taskPanel?.dispose();
    this.taskPanel = null;
    this.threadList = null;
    this.conversation = null;
    this.composer = null;
    this.sendButton = null;
    this.activity = null;
    this.accessSelect = null;
    this.modelSelect = null;
    this.reasoningSelect = null;
    this.contextModeEl = null;
    this.contextPermissionEl = null;
    super.dispose();
  }
}
