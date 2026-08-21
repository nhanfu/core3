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
  });
});
