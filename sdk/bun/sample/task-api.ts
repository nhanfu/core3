import type { CodexTaskRunner, TaskEvent, TaskRecord } from './task-runner.ts';
import { PUBLISH_PERMISSION, TASK_PERMISSION, TASK_POLICIES, type TaskMode } from './task-runner.ts';

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
  const { process: _process, diff: _diff, taskToken: _taskToken, ...safe } = task as TaskRecord & { process?: unknown; taskToken?: string };
  return safe;
}

export function createTaskApi(options: {
  authProvider: { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean };
  runner: CodexTaskRunner;
  actionHandlers?: Array<(request: Request, url: URL) => Response | null | undefined | Promise<Response | null | undefined>>;
}) {
  const { authProvider, runner, actionHandlers = [] } = options;
  return async (request: Request, url: URL): Promise<Response | null> => {
    if (url.pathname !== '/api/task-policies' && !/^\/api\/tasks(?:\/|$)/.test(url.pathname)) return null;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    const user = await authProvider.getCurrentUser(request);
    if (!authProvider.hasPermission(user, TASK_PERMISSION)) return json({ error: `Requires permission: ${TASK_PERMISSION}` }, 403);
    const actor = { id: String(user.sub || user.id || ''), name: String(user.name || user.email || user.sub || 'Unknown user') };
    if (!actor.id) return json({ error: 'Authenticated user identity is required' }, 401);
    if (url.pathname === '/api/task-policies' && request.method === 'GET') return json(TASK_POLICIES);

    const collection = url.pathname === '/api/tasks';
    const match = url.pathname.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)(?:\/(events|cancel|changes|approve|publish|rollback|action))?$/);
    if (collection && request.method === 'POST') {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: 'JSON request body is required' }, 400); }
      const mode = (body?.mode || 'staged') as TaskMode;
      if (mode === 'live' && !authProvider.hasPermission(user, PUBLISH_PERMISSION)) return json({ error: `Requires permission: ${PUBLISH_PERMISSION}` }, 403);
      const task = runner.create(actor, String(body?.prompt || ''), mode, request.headers.get('Authorization')?.slice(7) || '');
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
    if (operation === 'approve' && request.method === 'POST') {
      if (!runner.approve(id, actor)) return json({ error: 'Task is not awaiting approval' }, 409);
      return json(publicTask(runner.get(id)!));
    }
    if (operation === 'publish' && request.method === 'POST') {
      if (!authProvider.hasPermission(user, PUBLISH_PERMISSION)) return json({ error: `Requires permission: ${PUBLISH_PERMISSION}` }, 403);
      if (!await runner.publish(id, actor)) return json({ error: 'Task cannot be published' }, 409);
      return json(publicTask(runner.get(id)!));
    }
    if (operation === 'rollback' && request.method === 'POST') {
      if (!authProvider.hasPermission(user, PUBLISH_PERMISSION)) return json({ error: `Requires permission: ${PUBLISH_PERMISSION}` }, 403);
      if (!await runner.rollback(id, actor)) return json({ error: 'Task cannot be rolled back' }, 409);
      return json(publicTask(runner.get(id)!));
    }
    if (operation === 'action' && request.method === 'POST') {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: 'JSON request body is required' }, 400); }
      if (typeof body?.action !== 'string' || !body.action) return json({ error: 'action is required' }, 400);
      const result = await runner.executeAction(id, actor, body.action, body.values && typeof body.values === 'object' ? body.values : {}, async (task, action, values) => {
        const actionUrl = new URL(`/api/actions/${encodeURIComponent(action)}`, request.url);
        const actionRequest = new Request(actionUrl, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({ ...body, action: undefined, values, task_id: task.id }),
        });
        for (const handler of actionHandlers) {
          const response = await handler(actionRequest.clone(), actionUrl);
          if (response && response.status !== 404) {
            if (!response.ok) throw { status: response.status, message: (await response.clone().json().catch(() => ({})))?.error || 'Action failed' };
            return response.json();
          }
        }
        throw { status: 404, message: `Unknown action: ${action}` };
      });
      return json(result);
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
            if (['completed', 'awaiting_approval', 'published', 'rolled_back', 'failed', 'cancelled'].includes(event.status)) {
              closed = true;
              unsubscribe();
              controller.close();
            }
          };
          send({ type: 'status', task_id: task.id, status: task.status, at: new Date().toISOString() });
          unsubscribe = runner.subscribe(task.id, send);
          if (['completed', 'awaiting_approval', 'published', 'rolled_back', 'failed', 'cancelled'].includes(task.status)) {
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
