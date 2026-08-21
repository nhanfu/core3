import type { CodexTaskRunner, TaskEvent, TaskRecord } from './task-runner.ts';
import { PUBLISH_PERMISSION, TASK_PERMISSION, TASK_MODELS, TASK_POLICIES, TASK_REASONING_LEVELS, type TaskAccessMode, type TaskMode, type TaskReasoningLevel } from './task-runner.ts';
import type { AiThreadStore } from './ai-thread-store.ts';

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

function taskOptions(body: any) {
  const accessMode = String(body?.access_mode || body?.accessMode || (body?.mode === 'live' ? 'full_access' : 'ask')) as TaskAccessMode;
  const mode = (body?.mode === 'read' ? 'read' : accessMode === 'full_access' ? 'live' : 'staged') as TaskMode;
  return {
    mode,
    options: {
      accessMode,
      model: body?.model ? String(body.model) : undefined,
      reasoning: body?.reasoning ? String(body.reasoning) as TaskReasoningLevel : undefined,
    },
  };
}

export function createTaskApi(options: {
  authProvider: { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean };
  runner: CodexTaskRunner;
  threadStore: AiThreadStore;
  actionHandlers?: Array<(request: Request, url: URL) => Response | null | undefined | Promise<Response | null | undefined>>;
}) {
  const { authProvider, runner, threadStore, actionHandlers = [] } = options;
  return async (request: Request, url: URL): Promise<Response | null> => {
    if (url.pathname !== '/api/task-policies' && !/^\/api\/(?:tasks|ai\/threads)(?:\/|$)/.test(url.pathname)) return null;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    const user = await authProvider.getCurrentUser(request);
    if (!authProvider.hasPermission(user, TASK_PERMISSION)) return json({ error: `Requires permission: ${TASK_PERMISSION}` }, 403);
    const actor = { id: String(user.sub || user.id || ''), name: String(user.name || user.email || user.sub || 'Unknown user') };
    if (!actor.id) return json({ error: 'Authenticated user identity is required' }, 401);
    if (url.pathname === '/api/task-policies' && request.method === 'GET') return json({ ...TASK_POLICIES, models: TASK_MODELS, reasoning_levels: TASK_REASONING_LEVELS });

    const threadCollection = url.pathname === '/api/ai/threads';
    const threadMatch = url.pathname.match(/^\/api\/ai\/threads\/([A-Za-z0-9_-]+)(?:\/(messages|events))?$/);
    if (threadCollection || threadMatch) await threadStore.ensureReady();
    if (threadCollection && request.method === 'GET') {
      return json(threadStore.list(actor.id).map((thread) => ({ ...thread, messages: thread.messages.slice(-1) })));
    }
    if (threadCollection && request.method === 'POST') {
      let body: any;
      try { body = await request.json(); } catch { body = {}; }
      return json(await threadStore.create(actor, String(body?.title || body?.prompt || 'New project task')), 201);
    }
    if (threadMatch) {
      const [, threadId, operation] = threadMatch;
      const thread = threadStore.get(threadId, actor.id);
      if (!thread) return json({ error: 'Thread not found' }, 404);
      if (!operation && request.method === 'GET') {
        return json({ ...thread, tasks: thread.taskIds.map((id) => runner.get(id)).filter(Boolean).map((task) => publicTask(task!)) });
      }
      if (operation === 'messages' && request.method === 'POST') {
        let body: any;
        try { body = await request.json(); } catch { return json({ error: 'JSON request body is required' }, 400); }
        const prompt = String(body?.prompt || '').trim();
        const { mode, options } = taskOptions(body);
        if (!prompt) return json({ error: 'prompt is required' }, 400);
        if (options.accessMode === 'full_access' && !authProvider.hasPermission(user, PUBLISH_PERMISSION)) return json({ error: `Requires permission: ${PUBLISH_PERMISSION}` }, 403);
        await threadStore.addMessage(threadId, actor.id, { role: 'user', text: prompt });
        try {
          const task = runner.create(actor, prompt, mode, request.headers.get('Authorization')?.slice(7) || '', options);
          await threadStore.attachTask(threadId, actor.id, task.id);
          await threadStore.addMessage(threadId, actor.id, {
            role: 'assistant',
            text: options.accessMode === 'full_access'
              ? 'I’m running with full access inside the authorized project boundary. I’ll inspect the project, make the requested changes, validate them, and prepare the result.'
              : 'I’m working in a staged workspace and will ask before approval-sensitive actions. I’ll inspect the project, make the requested changes, validate them, and prepare a review.',
            taskId: task.id,
            status: task.status,
          });
          return json({ thread: threadStore.get(threadId, actor.id), task: publicTask(task) }, 202);
        } catch (error) {
          return json({ error: (error as any)?.message || 'Could not start task' }, (error as any)?.status || 400);
        }
      }
      return json({ error: 'Unsupported thread operation' }, 405);
    }

    const collection = url.pathname === '/api/tasks';
    const match = url.pathname.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)(?:\/(events|cancel|changes|approve|publish|rollback|action))?$/);
    if (collection && request.method === 'POST') {
      let body: any;
      try { body = await request.json(); } catch { return json({ error: 'JSON request body is required' }, 400); }
      const { mode, options } = taskOptions(body);
      if (options.accessMode === 'full_access' && !authProvider.hasPermission(user, PUBLISH_PERMISSION)) return json({ error: `Requires permission: ${PUBLISH_PERMISSION}` }, 403);
      const task = runner.create(actor, String(body?.prompt || ''), mode, request.headers.get('Authorization')?.slice(7) || '', options);
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
