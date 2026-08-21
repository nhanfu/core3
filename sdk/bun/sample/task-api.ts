import type { CodexTaskRunner, TaskEvent, TaskRecord } from './task-runner.ts';
import { TASK_PERMISSION } from './task-runner.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function publicTask(task: TaskRecord) {
  const { process: _process, diff: _diff, ...safe } = task as TaskRecord & { process?: unknown };
  return safe;
}

export function createTaskApi(options: {
  authProvider: { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean };
  runner: CodexTaskRunner;
}) {
  const { authProvider, runner } = options;
  return async (request: Request, url: URL): Promise<Response | null> => {
    if (!url.pathname.startsWith('/api/tasks')) return null;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    const user = await authProvider.getCurrentUser(request);
    if (!authProvider.hasPermission(user, TASK_PERMISSION)) return json({ error: `Requires permission: ${TASK_PERMISSION}` }, 403);
    const actor = { id: String(user.sub || user.id || ''), name: String(user.name || user.email || user.sub || 'Unknown user') };
    if (!actor.id) return json({ error: 'Authenticated user identity is required' }, 401);

    const collection = url.pathname === '/api/tasks';
    const match = url.pathname.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)(?:\/(events|cancel|changes))?$/);
    if (collection && request.method === 'POST') {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: 'JSON request body is required' }, 400); }
      const task = runner.create(actor, String(body?.prompt || ''));
      return json(publicTask(task), 202);
    }
    if (!match) return json({ error: 'Task route not found' }, 404);
    const [, id, operation] = match;
    const task = runner.get(id);
    if (!task || !runner.canRead(task, actor.id)) return json({ error: 'Task not found' }, 404);
    if (!operation && request.method === 'GET') return json(publicTask(task));
    if (operation === 'changes' && request.method === 'GET') {
      return json({ id: task.id, status: task.status, changed_files: task.changedFiles, validation: task.validation, diff: task.diff || '' });
    }
    if (operation === 'cancel' && request.method === 'POST') {
      if (!runner.cancel(id, actor.id)) return json({ error: 'Task cannot be cancelled' }, 409);
      return json(publicTask(runner.get(id)!));
    }
    if (operation === 'events' && request.method === 'GET') {
      const encoder = new TextEncoder();
      let unsubscribe = () => {};
      let closed = false;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const send = (event: TaskEvent) => {
            if (closed) return;
            controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
            if (['completed', 'failed', 'cancelled'].includes(event.status)) {
              closed = true;
              unsubscribe();
              controller.close();
            }
          };
          send({ type: 'status', task_id: task.id, status: task.status, at: new Date().toISOString() });
          unsubscribe = runner.subscribe(task.id, send);
          if (['completed', 'failed', 'cancelled'].includes(task.status)) {
            send({ type: task.status === 'completed' ? 'complete' : 'error', task_id: task.id, status: task.status, data: task.error, at: new Date().toISOString() });
          }
        },
        cancel() { unsubscribe(); },
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...CORS_HEADERS } });
    }
    return json({ error: 'Unsupported task operation' }, 405);
  };
}
