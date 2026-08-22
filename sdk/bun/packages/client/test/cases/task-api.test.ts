import { describe, expect, it } from 'vitest';
import { createTaskApi } from '../../../../sample/task-api.ts';

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

describe('Codex task API', () => {
  it('requires the generic project task permission', async () => {
    const api = createTaskApi({
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: () => false },
      runner: {} as any,
    });
    const response = await api(request('/api/tasks', { method: 'POST', body: JSON.stringify({ prompt: 'inspect' }) }), new URL('http://localhost/api/tasks'));
    expect(response?.status).toBe(403);
  });

  it('creates an authenticated task and exposes staged changes separately', async () => {
    const task: any = { id: 'task_1', actorId: 'u1', actorName: 'Director', prompt: 'inspect', status: 'completed', createdAt: '', updatedAt: '', output: 'ok', changedFiles: ['sample/services/dashboard/manifest.yaml'], validation: { ok: true }, diff: 'diff' };
    const runner: any = {
      create: () => task,
      get: () => task,
      canRead: () => true,
      subscribe: () => () => {},
      cancel: () => false,
    };
    const api = createTaskApi({
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: (_user, permission) => permission === 'project.task.execute' },
      runner,
    });
    const created = await api(request('/api/tasks', { method: 'POST', body: JSON.stringify({ prompt: 'inspect' }) }), new URL('http://localhost/api/tasks'));
    expect(created?.status).toBe(202);
    expect(await created?.json()).not.toHaveProperty('diff');
    const changes = await api(request('/api/tasks/task_1/changes'), new URL('http://localhost/api/tasks/task_1/changes'));
    expect(changes?.status).toBe(200);
    expect(await changes?.json()).toMatchObject({ changed_files: ['sample/services/dashboard/manifest.yaml'], diff: 'diff', validation: { ok: true } });
    const policies = await api(request('/api/task-policies'), new URL('http://localhost/api/task-policies'));
    expect(await policies?.json()).toMatchObject({
      read: { sandbox: 'read-only', requiresApproval: false },
      staged: { sandbox: 'workspace-write', requiresApproval: true },
      live: { sandbox: 'workspace-write', requiresApproval: true },
    });
  });

  it('requires publish permission for live mode and forwards approved actions to Core3 handlers', async () => {
    const task: any = { id: 'task_live', actorId: 'u1', actorName: 'Director', prompt: 'execute', mode: 'live', status: 'approved', createdAt: '', updatedAt: '', output: '', changedFiles: [] };
    let actionSeen = '';
    const runner: any = {
      create: () => task,
      get: () => task,
      canRead: () => true,
      subscribe: () => () => {},
      cancel: () => false,
      approve: () => true,
      publish: async () => true,
      rollback: async () => true,
      executeAction: async (_id, _actor, action, values, execute) => {
        actionSeen = `${action}:${String(values.id)}`;
        return execute(task, action, values);
      },
    };
    const api = createTaskApi({
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: (_user, permission) => permission !== 'project.task.publish' },
      runner,
      actionHandlers: [async (_request, url) => url.pathname === '/api/actions/project.tasks.start' ? new Response(JSON.stringify({ ok: true }), { status: 200 }) : null],
    });
    const denied = await api(request('/api/tasks', { method: 'POST', body: JSON.stringify({ prompt: 'execute', mode: 'live' }) }), new URL('http://localhost/api/tasks'));
    expect(denied?.status).toBe(403);

    const liveApi = createTaskApi({
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: () => true },
      runner,
      actionHandlers: [async (_request, url) => url.pathname === '/api/actions/project.tasks.start' ? new Response(JSON.stringify({ ok: true }), { status: 200 }) : null],
    });
    const response = await liveApi(request('/api/tasks/task_live/action', { method: 'POST', body: JSON.stringify({ action: 'project.tasks.start', values: { id: 'row-1' } }) }), new URL('http://localhost/api/tasks/task_live/action'));
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ ok: true });
    expect(actionSeen).toBe('project.tasks.start:row-1');
  });

  it('forwards Codex access, model, and reasoning settings', async () => {
    const task: any = { id: 'task_configured', actorId: 'u1', actorName: 'Director', prompt: 'inspect', status: 'queued', createdAt: '', updatedAt: '', output: '', changedFiles: [] };
    let received: any[] = [];
    const api = createTaskApi({
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: () => true },
      runner: { create: (...args: any[]) => { received = args; return task; } } as any,
    });
    const response = await api(request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'inspect', access_mode: 'full_access', model: 'gpt-5.3-codex', reasoning: 'high' }),
    }), new URL('http://localhost/api/tasks'));
    expect(response?.status).toBe(202);
    expect(received[2]).toBe('live');
    expect(received[4]).toMatchObject({ accessMode: 'full_access', model: 'gpt-5.3-codex', reasoning: 'high' });
  });
});
