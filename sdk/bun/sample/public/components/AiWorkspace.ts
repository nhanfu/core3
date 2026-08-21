import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendFilledIcon, appendIcon } from '@core3/client/components/Icon';
import { apiFetch } from '../app.ts';
import { TaskRunnerPanel } from './TaskRunnerPanel.ts';

type AiMessage = { role: 'user' | 'assistant' | 'system'; text: string; taskId?: string; createdAt?: string };
type AiThread = { id: string; title: string; updatedAt: string; messages: AiMessage[]; taskIds: string[]; tasks?: any[] };

export class AiWorkspace extends BaseComponent {
  private threadList: HTMLElement | null = null;
  private conversation: HTMLElement | null = null;
  private composer: HTMLTextAreaElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private activity: HTMLElement | null = null;
  private current: AiThread | null = null;
  private taskPanel: TaskRunnerPanel | null = null;

  submitPrompt(prompt: string) {
    if (!this.composer) return;
    this.composer.value = prompt;
    void this.send();
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
    this.conversation = html.take(main).div.className('ai-workspace-conversation').ele();
    this.activity = html.take(this.conversation).div.className('ai-workspace-activity').ele();
    const composer = html.take(main).form.className('ai-workspace-composer').ele() as HTMLFormElement;
    const composerRow = html.take(composer).div.className('ai-workspace-composer-row').ele();
    this.composer = html.take(composerRow).textarea
      .attr('rows', '2').attr('placeholder', 'Ask Core3 to change the project…')
      .attr('aria-label', 'Message Core3 project agent').ele() as HTMLTextAreaElement;
    this.sendButton = html.take(composerRow).button.className('ai-workspace-send').attr('type', 'submit').ele() as HTMLButtonElement;
    appendIcon(this.sendButton, 'arrow-right');
    html.take(composer).div.className('ai-workspace-composer-hint').text('Staged workspace · approval required before publish');
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
    this.activity.innerHTML = '';
    this.conversation.querySelector('.ai-workspace-message-list')?.remove();
    const messages = html.take(this.conversation).div.className('ai-workspace-message-list').ele();
    for (const message of thread.messages) {
      const bubble = html.take(messages).div.className(`ai-workspace-message is-${message.role}`).ele();
      html.take(bubble).div.className('ai-workspace-message-role').text(message.role === 'user' ? 'You' : 'Core3');
      html.take(bubble).div.className('ai-workspace-message-text').text(message.text);
    }
    this.conversation.appendChild(this.activity);
    this.threadList?.querySelectorAll('.ai-workspace-thread').forEach((item) => item.classList.remove('is-active'));
  }

  private renderWelcome() {
    if (!this.conversation || !this.activity) return;
    this.conversation.querySelector('.ai-workspace-message-list')?.remove();
    const welcome = html.take(this.conversation).div.className('ai-workspace-welcome').ele();
    const icon = html.take(welcome).span.className('ai-workspace-welcome-icon').ele();
    appendFilledIcon(icon, 'ai');
    html.take(welcome).h2.text('What should we build?');
    html.take(welcome).p.text('Ask Core3 to inspect, create, or improve a service. Changes begin in a staged workspace.');
    this.conversation.appendChild(this.activity);
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
        method: 'POST', body: JSON.stringify({ prompt, mode: 'staged' }),
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
    super.dispose();
  }
}
