import { cp, mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { env } from 'node:process';
import { discoverPages } from '@core3/server/discovery';

export type TaskEvent = {
  type: 'status' | 'output' | 'complete' | 'error';
  task_id: string;
  status: TaskStatus;
  stream?: 'stdout' | 'stderr';
  data?: unknown;
  at: string;
};

export type TaskStatus = 'queued' | 'running' | 'validating' | 'completed' | 'failed' | 'cancelled';

export type TaskRecord = {
  id: string;
  actorId: string;
  actorName: string;
  prompt: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  workspace?: string;
  exitCode?: number | null;
  output: string;
  changedFiles: string[];
  validation?: { ok: boolean; error?: string };
  diff?: string;
  error?: string;
};

type Subscriber = (event: TaskEvent) => void;

const MAX_PROMPT = 12_000;
const MAX_OUTPUT = 1_000_000;
const MAX_TASKS = 2;
const TASK_PERMISSION = 'project.task.execute';

function now() { return new Date().toISOString(); }
function taskId() { return `task_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`; }

async function copyProject(source: string, destination: string) {
  await cp(source, destination, {
    recursive: true,
    filter: (path) => {
      const name = basename(path);
      return name !== 'node_modules' && name !== 'dist' && name !== '.data' && name !== 'coredb';
    },
  });
}

async function filesUnder(root: string, current = root, result: string[] = []): Promise<string[]> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.data' || entry.name === 'coredb') continue;
    if (entry.isDirectory()) await filesUnder(root, path, result);
    else result.push(relative(root, path));
  }
  return result.sort();
}

async function changedFiles(original: string, staged: string): Promise<string[]> {
  const names = new Set([
    ...(await filesUnder(original)),
    ...(await filesUnder(staged)),
  ]);
  const changed: string[] = [];
  for (const name of names) {
    const left = join(original, name);
    const right = join(staged, name);
    let leftText: string | null = null;
    let rightText: string | null = null;
    try { leftText = (await stat(left)).isFile() ? await readFile(left, 'utf8') : null; } catch { /* added file */ }
    try { rightText = (await stat(right)).isFile() ? await readFile(right, 'utf8') : null; } catch { /* deleted file */ }
    if (leftText !== rightText) changed.push(name);
  }
  return changed;
}

async function directoryDiff(original: string, staged: string, names: string[]): Promise<string> {
  let result = '';
  for (const name of names.slice(0, 200)) {
    if (result.length >= 300_000) break;
    const left = join(original, name);
    const right = join(staged, name);
    const child = (Bun as any).spawn(['git', 'diff', '--no-index', '--unified=3', '--', left, right], {
      stdout: 'pipe', stderr: 'ignore',
    });
    const text = await new Response(child.stdout).text();
    await child.exited;
    result += text.replaceAll(original, 'project').replaceAll(staged, 'staged')
      || `--- project/${name}\n+++ staged/${name}\n`;
  }
  return result.slice(0, 300_000);
}

export class CodexTaskRunner {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private active = 0;

  constructor(private readonly projectRoot: string) {}

  get(id: string) { return this.tasks.get(id) || null; }

  canRead(task: TaskRecord, actorId: string) {
    return task.actorId === actorId;
  }

  subscribe(id: string, subscriber: Subscriber) {
    const subscribers = this.subscribers.get(id) || new Set<Subscriber>();
    subscribers.add(subscriber);
    this.subscribers.set(id, subscribers);
    return () => {
      subscribers.delete(subscriber);
      if (!subscribers.size) this.subscribers.delete(id);
    };
  }

  create(actor: { id: string; name: string }, prompt: string) {
    const normalized = prompt.trim();
    if (!normalized || normalized.length > MAX_PROMPT) throw { status: 400, message: `Prompt must be between 1 and ${MAX_PROMPT} characters` };
    if (this.active >= MAX_TASKS) throw { status: 429, message: 'Too many project tasks are running' };
    const id = taskId();
    const timestamp = now();
    const task: TaskRecord = {
      id, actorId: actor.id, actorName: actor.name, prompt: normalized,
      status: 'queued', createdAt: timestamp, updatedAt: timestamp,
      output: '', changedFiles: [],
    };
    this.tasks.set(id, task);
    void this.run(task);
    return task;
  }

  cancel(id: string, actorId: string) {
    const task = this.tasks.get(id);
    if (!task || !this.canRead(task, actorId)) return false;
    const process = (task as TaskRecord & { process?: { kill(): void } }).process;
    if (!process || ['completed', 'failed', 'cancelled'].includes(task.status)) return false;
    process.kill();
    task.status = 'cancelled';
    task.updatedAt = now();
    this.emit(task, { type: 'status', status: 'cancelled' });
    return true;
  }

  private emit(task: TaskRecord, event: Omit<TaskEvent, 'task_id' | 'at' | 'status'> & { status?: TaskStatus }) {
    const full: TaskEvent = { ...event, task_id: task.id, status: event.status || task.status, at: now() };
    for (const subscriber of this.subscribers.get(task.id) || []) subscriber(full);
  }

  private appendOutput(task: TaskRecord, stream: 'stdout' | 'stderr', text: string) {
    if (task.output.length >= MAX_OUTPUT) return;
    const value = text.slice(0, MAX_OUTPUT - task.output.length);
    task.output += value;
    task.updatedAt = now();
    this.emit(task, { type: 'output', stream, data: value });
  }

  private async validate(task: TaskRecord, stagedRoot: string) {
    task.status = 'validating';
    task.updatedAt = now();
    this.emit(task, { type: 'status' });
    try {
      discoverPages(join(stagedRoot, 'sample'));
      task.validation = { ok: true };
    } catch (error) {
      task.validation = { ok: false, error: String((error as Error)?.message || error) };
      throw error;
    }
  }

  private async run(task: TaskRecord) {
    this.active += 1;
    let stagingRoot = '';
    try {
      task.status = 'running';
      task.updatedAt = now();
      this.emit(task, { type: 'status' });
      stagingRoot = await mkdtemp(join(tmpdir(), 'core3-task-'));
      const stagedRepo = join(stagingRoot, 'repo');
      await copyProject(this.projectRoot, stagedRepo);
      task.workspace = stagedRepo;

      const args = [
        'exec', '--sandbox', 'workspace-write', '--ephemeral', '--json',
        '--skip-git-repo-check', '--cd', stagedRepo,
        `${task.prompt}\n\nWork only inside this staged Core3 project. Preserve YAML-first architecture. Do not publish, deploy, access secrets, or modify files outside the workspace. Run relevant validation before finishing.`,
      ];
      const child = (Bun as any).spawn([env.CORE3_CODEX_BIN || 'codex', ...args], {
        cwd: stagedRepo,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          PATH: env.PATH || '',
          ...(env.HOME ? { HOME: env.HOME } : {}),
          ...(env.CODEX_HOME ? { CODEX_HOME: env.CODEX_HOME } : {}),
          ...(env.XDG_CONFIG_HOME ? { XDG_CONFIG_HOME: env.XDG_CONFIG_HOME } : {}),
        },
      });
      (task as TaskRecord & { process?: typeof child }).process = child;
      const consume = async (stream: ReadableStream<Uint8Array>, name: 'stdout' | 'stderr') => {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          this.appendOutput(task, name, decoder.decode(chunk.value, { stream: true }));
        }
      };
      await Promise.all([consume(child.stdout, 'stdout'), consume(child.stderr, 'stderr')]);
      task.exitCode = await child.exited;
      if (String(task.status) === 'cancelled') return;
      if (task.exitCode !== 0) throw new Error(`Codex exited with code ${task.exitCode}`);
      await this.validate(task, stagedRepo);
      task.changedFiles = await changedFiles(this.projectRoot, stagedRepo);
      task.diff = await directoryDiff(this.projectRoot, stagedRepo, task.changedFiles);
      task.status = 'completed';
      task.updatedAt = now();
      this.emit(task, { type: 'complete', data: { changed_files: task.changedFiles, validation: task.validation } });
    } catch (error) {
      if (task.status !== 'cancelled') {
        task.status = 'failed';
        task.error = String((error as Error)?.message || error);
        task.updatedAt = now();
        this.emit(task, { type: 'error', data: task.error });
      }
    } finally {
      delete (task as TaskRecord & { process?: unknown }).process;
      this.active -= 1;
      // Staged work is intentionally retained for Phase 3 review and diff inspection.
    }
  }
}

export { TASK_PERMISSION };
