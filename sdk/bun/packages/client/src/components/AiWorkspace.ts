import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendFilledIcon, appendIcon } from '@core3/client/components/Icon';
import { TaskRunnerPanel } from '@core3/client/components/TaskRunnerPanel';

type AiMessage = { id?: string; role?: string; text?: string; task_id?: string; created_at?: string };
type AiThread = { id?: string; title?: string; status?: string; updated_at?: string; preview?: string; latest_task_id?: string };

/**
 * One-shot handoff for prompts typed outside the workspace (for example the
 * app picker search box). The prompt is staged before navigating to the page
 * that hosts this component; the component submits it after mounting.
 */
const PENDING_PROMPT_KEY = 'core3_ai_pending_prompt';

export function stageAiPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed) sessionStorage.setItem(PENDING_PROMPT_KEY, trimmed);
}

export function mount(container: HTMLElement) {
  new AiWorkspace('ai-workspace', {}).mount(container);
}

export class AiWorkspace extends BaseComponent {
  def: any;

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
  private currentThreadId: string | null = null;
  private taskPanel: TaskRunnerPanel | null = null;

  constructor(id: string, state: any, def: any = {}) {
    super(id, {
      threads: [],
      messages: [],
      currentUserId: '',
      ...state,
    });
    this.def = def || {};
  }

  private label(key: string, fallback: string) {
    const value = this.def?.[key];
    return value === undefined || value === null || value === '' ? fallback : String(value);
  }

  private threads(): AiThread[] {
    return Array.isArray(this.state.threads) ? this.state.threads : [];
  }

  private messages(): AiMessage[] {
    return Array.isArray(this.state.messages) ? this.state.messages : [];
  }

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
    html.take(copy).div.className('app-picker-task-eyebrow').text(this.label('eyebrow', 'CORE3 AGENT'));
    html.take(copy).h1.text(this.label('heading', 'Project workspace'));
    html.take(copy).p.text(this.label('description', 'Plan, change, and review your YAML-driven project.'));
    const newThread = html.take(header).button.className('ai-workspace-new').attr('type', 'button').text(this.label('new_thread_label', 'New thread')).ele();
    appendIcon(newThread, 'plus');
    newThread.addEventListener('click', () => this.newThread());

    const body = document.createElement('div');
    body.className = 'ai-workspace-body';
    root.appendChild(body);
    const sidebar = html.take(body).aside.className('ai-workspace-sidebar').ele();
    const sidebarTitle = html.take(sidebar).div.className('ai-workspace-sidebar-title').ele();
    html.take(sidebarTitle).span.text(this.label('threads_label', 'Threads'));
    this.threadList = html.take(sidebar).div.className('ai-workspace-thread-list').ele();
    const main = document.createElement('main');
    main.className = 'ai-workspace-main';
    body.appendChild(main);
    const context = html.take(main).div.className('ai-workspace-context').ele();
    html.take(context).span.className('ai-workspace-context-label').text('Context');
    html.take(context).span.className('ai-workspace-context-value').text(this.label('context_value', 'core3 project'));
    html.take(context).span.className('ai-workspace-context-divider').text('·');
    this.contextModeEl = html.take(context).span.className('ai-workspace-context-value').text('ask for approval').ele();
    html.take(context).span.className('ai-workspace-context-divider').text('·');
    this.contextPermissionEl = html.take(context).span.className('ai-workspace-context-permission').text('approval required').ele();
    this.conversation = html.take(main).div.className('ai-workspace-conversation').ele();
    this.activity = html.take(this.conversation).div.className('ai-workspace-activity').ele();
    const composerForm = html.take(main).form.className('ai-workspace-composer').ele() as HTMLFormElement;
    const composerRow = html.take(composerForm).div.className('ai-workspace-composer-row').ele();
    this.composer = html.take(composerRow).textarea
      .attr('rows', '2').attr('placeholder', this.label('composer_placeholder', 'Ask Core3 to change the project…'))
      .attr('aria-label', 'Message Core3 project agent').ele() as HTMLTextAreaElement;
    this.sendButton = html.take(composerRow).button.className('ai-workspace-send').attr('type', 'submit').ele() as HTMLButtonElement;
    appendIcon(this.sendButton, 'arrow-right');
    const controls = html.take(composerForm).div.className('ai-workspace-composer-controls').ele();
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
    composerForm.addEventListener('submit', (event) => { event.preventDefault(); void this.send(); });
    this.composer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void this.send(); }
    });

    this.renderThreadList();
    if (!this.currentThreadId) this.currentThreadId = this.threads()[0]?.id || null;
    this.renderConversation();
    if (this.currentThreadId) queueMicrotask(() => this.mountLatestTask());

    // A prompt staged before navigating here (for example from the app
    // launcher search) is submitted exactly once, after first mount.
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      queueMicrotask(() => this.submitPrompt(pending));
    }
  }

  private renderThreadList() {
    if (!this.threadList) return;
    this.threadList.innerHTML = '';
    const threads = this.threads();
    if (!threads.length) {
      html.take(this.threadList).p.className('ai-workspace-empty-list').text(this.label('empty_threads', 'No threads yet'));
      return;
    }
    for (const thread of threads) {
      const item = html.take(this.threadList).button.className(`ai-workspace-thread${this.currentThreadId === thread.id ? ' is-active' : ''}`).attr('type', 'button').ele();
      item.dataset.threadId = String(thread.id || '');
      html.take(item).span.className('ai-workspace-thread-title').text(String(thread.title || thread.id));
      html.take(item).span.className('ai-workspace-thread-time').text(this.relativeTime(String(thread.updated_at || '')));
      item.addEventListener('click', () => { void this.openThread(String(thread.id)); });
    }
  }

  private async openThread(threadId: string) {
    this.currentThreadId = threadId;
    this.renderThreadList();
    this.renderConversation();
    await this.loadMessages();
    this.mountLatestTask();
  }

  private async loadMessages() {
    const loader = this.def?.load_messages;
    if (typeof loader !== 'function') return;
    try {
      await loader(this.currentThreadId || '');
    } catch (error) {
      console.error('[ai-workspace] Failed to load messages:', error);
    }
    this.renderConversation();
  }

  private renderConversation() {
    if (!this.conversation || !this.activity) return;
    if (!this.currentThreadId) {
      this.renderWelcome();
      return;
    }
    this.conversation.innerHTML = '';
    this.conversation.appendChild(this.activity);
    const list = html.take(this.conversation).div.className('ai-workspace-message-list').ele();
    for (const message of this.messages()) {
      if (!message?.text) continue;
      const role = String(message.role || 'assistant');
      const bubble = html.take(list).div.className(`ai-workspace-message is-${role}`).ele();
      html.take(bubble).div.className('ai-workspace-message-role').text(role === 'user' ? 'You' : 'Core3');
      html.take(bubble).div.className('ai-workspace-message-text').text(String(message.text));
    }
    this.conversation.appendChild(this.activity);
  }

  private renderWelcome() {
    if (!this.conversation || !this.activity) return;
    this.conversation.innerHTML = '';
    const welcome = html.take(this.conversation).div.className('ai-workspace-welcome').ele();
    const icon = html.take(welcome).span.className('ai-workspace-welcome-icon').ele();
    appendFilledIcon(icon, 'ai');
    html.take(welcome).h2.text(this.label('welcome_title', 'What should we build?'));
    html.take(welcome).p.text(this.label('welcome_description', 'Ask Core3 to inspect, create, or improve a service.'));
    const suggestions = html.take(welcome).div.className('ai-workspace-suggestions').ele();
    const ideas = Array.isArray(this.def?.suggestions) ? this.def.suggestions : ['Inspect this project'];
    for (const suggestion of ideas) {
      const button = html.take(suggestions).button.className('ai-workspace-suggestion').attr('type', 'button').text(String(suggestion)).ele();
      button.addEventListener('click', () => this.submitPrompt(String(suggestion)));
    }
    this.conversation.appendChild(this.activity);
  }

  /** Mount the live task panel for the newest task recorded in the thread. */
  private mountLatestTask() {
    if (!this.activity) return;
    const withTask = this.messages().filter((message) => message?.task_id);
    const latest = withTask.at(-1);
    const thread = this.threads().find((entry) => entry.id === this.currentThreadId);
    const taskId = String(latest?.task_id || thread?.latest_task_id || '');
    if (!taskId) return;
    this.taskPanel?.dispose();
    this.taskPanel = this.mountChild(new TaskRunnerPanel(`ai-task-${taskId}`, {
      prompt: String(latest?.text || thread?.title || ''),
      taskId,
    }), this.activity);
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

  private async runAction(defKey: string, values: Record<string, unknown>) {
    const actionId = String(this.def?.[defKey] || '');
    const runner = this.def?.run_action;
    if (!actionId || typeof runner !== 'function') throw new Error(`AI action is not configured: ${defKey}`);
    return runner(actionId, values);
  }

  private newThread() {
    this.currentThreadId = null;
    this.taskPanel?.dispose();
    this.taskPanel = null;
    if (this.activity) this.activity.innerHTML = '';
    this.renderThreadList();
    this.renderConversation();
    this.composer?.focus();
  }

  private async send() {
    const prompt = this.composer?.value.trim() || '';
    if (!prompt || !this.sendButton) return;
    this.sendButton.disabled = true;
    try {
      let threadId = this.currentThreadId;
      // A cached page or a service restart can leave the component holding a
      // thread that is no longer present in the current user's datasource.
      // Start a fresh thread instead of sending an invalid id.
      if (threadId && !this.threads().some((thread) => String(thread.id || '') === threadId)) {
        threadId = null;
        this.currentThreadId = null;
      }
      if (!threadId) {
        const created = await this.runAction('create_thread_action', { title: prompt.slice(0, 120) });
        threadId = String(created?.thread_id || created?.id || '');
        if (!threadId) throw new Error('Could not create thread');
        this.currentThreadId = threadId;
      }
      await this.runAction('send_action', { thread_id: threadId, prompt });
      if (this.composer) this.composer.value = '';
      await this.def?.refresh?.();
      // Data refreshes redraw the workspace, so the live task panel is only
      // mounted once the DOM has settled.
      await this.loadMessages();
      if (this.activity) {
        this.taskPanel?.dispose();
        this.taskPanel = this.mountChild(new TaskRunnerPanel(`ai-task-${Date.now()}`, {
          prompt,
          access_mode: this.accessSelect?.value || 'ask',
          model: this.modelSelect?.value || 'gpt-5.6-luna',
          reasoning: this.reasoningSelect?.value || 'medium',
          onTaskStarted: (taskId) => this.attachTask(threadId!, taskId),
        }), this.activity);
      }
    } catch (error) {
      if (this.activity) html.take(this.activity).div.className('ai-workspace-send-error').text(String((error as Error).message || error));
    } finally {
      this.sendButton.disabled = false;
      this.composer?.focus();
    }
  }

  private async attachTask(threadId: string, taskId: string) {
    try {
      await this.runAction('attach_task_action', {
        thread_id: threadId,
        task_id: taskId,
        access_mode: this.accessSelect?.value || 'ask',
      });
      await this.def?.refresh?.();
      await this.loadMessages();
      // The refresh redraws the workspace, so restore the live panel.
      this.mountLatestTask();
    } catch (error) {
      console.error('[ai-workspace] Failed to attach task to thread:', error);
    }
  }

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
