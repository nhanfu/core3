import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  taskId?: string;
  status?: string;
  createdAt: string;
};

export type AiThread = {
  id: string;
  actorId: string;
  actorName: string;
  title: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
  taskIds: string[];
};

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`; }

export class AiThreadStore {
  private threads = new Map<string, AiThread>();
  private writeQueue: Promise<void> = Promise.resolve();
  private ready: Promise<void>;

  constructor(private readonly filePath: string) {
    this.ready = this.load();
  }

  async ensureReady() { await this.ready; }

  private async load() {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8'));
      for (const thread of Array.isArray(parsed) ? parsed : []) {
        if (thread?.id && thread?.actorId) this.threads.set(String(thread.id), thread as AiThread);
      }
    } catch {
      // First run or an empty development data directory.
    }
  }

  private persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify([...this.threads.values()], null, 2));
    });
    return this.writeQueue;
  }

  list(actorId: string) {
    return [...this.threads.values()]
      .filter((thread) => thread.actorId === actorId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  get(threadId: string, actorId: string) {
    const thread = this.threads.get(threadId);
    return thread?.actorId === actorId ? thread : null;
  }

  async create(actor: { id: string; name: string }, title: string) {
    await this.ensureReady();
    const timestamp = now();
    const thread: AiThread = {
      id: id('thread'), actorId: actor.id, actorName: actor.name,
      title: title.trim().slice(0, 120) || 'New project task', status: 'active',
      createdAt: timestamp, updatedAt: timestamp, messages: [], taskIds: [],
    };
    this.threads.set(thread.id, thread);
    await this.persist();
    return thread;
  }

  async addMessage(threadId: string, actorId: string, message: Omit<AiMessage, 'id' | 'createdAt'>) {
    await this.ensureReady();
    const thread = this.get(threadId, actorId);
    if (!thread) return null;
    thread.messages.push({ ...message, id: id('msg'), createdAt: now() });
    thread.updatedAt = now();
    await this.persist();
    return thread;
  }

  async attachTask(threadId: string, actorId: string, taskId: string) {
    await this.ensureReady();
    const thread = this.get(threadId, actorId);
    if (!thread) return null;
    if (!thread.taskIds.includes(taskId)) thread.taskIds.push(taskId);
    thread.updatedAt = now();
    await this.persist();
    return thread;
  }
}
