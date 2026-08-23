import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { createAiAgentApi } from '../../../../sample/services/ai/ai-agent-api.ts';

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API-only AI agent gateway', () => {
  it('rejects users without ai.write', async () => {
    const api = createAiAgentApi({
      appsRoot: resolve(process.cwd(), '..', '..', 'sample'),
      authProvider: { getCurrentUser: async () => ({ sub: 'u1' }), hasPermission: () => false },
      provider: { generate: async () => ({ parts: [] }) },
      invoke: async () => null,
    });
    const response = await api(request('/api/ai/agent', { prompt: 'inspect' }), new URL('http://localhost/api/ai/agent'));
    expect(response?.status).toBe(403);
  });

  it('passes the original bearer token only to the registered Core3 API', async () => {
    let seen: Request | null = null;
    const api = createAiAgentApi({
      appsRoot: resolve(process.cwd(), '..', '..', 'sample'),
      authProvider: { getCurrentUser: async () => ({ sub: 'u1', permissions: ['ai.write', 'ecommerce.write'] }), hasPermission: (_user, permission) => ['ai.write', 'ecommerce.write'].includes(permission) },
      provider: { generate: async () => ({ parts: [{ type: 'text', markdown: 'Ready.' }], calls: [{ operation: 'ecommerce.orders.confirm', values: { id: 'o1' } }] }) },
      invoke: async (request) => { seen = request; return new Response(JSON.stringify({ ok: true }), { status: 200 }); },
    });
    const response = await api(request('/api/ai/agent', { prompt: 'confirm order' }), new URL('http://localhost/api/ai/agent'));
    expect(response?.status).toBe(200);
    const generated = await response?.json();
    expect(generated).toMatchObject({ parts: [{ type: 'text' }, { type: 'approval' }] });
    expect(seen).toBeNull();
    const confirmed = await api(request('/api/ai/agent/confirm', { preview_id: generated.parts[1].preview_id }), new URL('http://localhost/api/ai/agent/confirm'));
    expect(confirmed?.status).toBe(200);
    expect(seen?.headers.get('authorization')).toBe('Bearer user-token');
  });

  it('does not execute confirmation with a different user token', async () => {
    const api = createAiAgentApi({
      appsRoot: resolve(process.cwd(), '..', '..', 'sample'),
      authProvider: { getCurrentUser: async (request) => ({ sub: request.headers.get('x-user') || 'u1', permissions: ['ai.write', 'ecommerce.write'] }), hasPermission: () => true },
      provider: { generate: async () => ({ parts: [], calls: [{ operation: 'ecommerce.orders.confirm', values: { id: 'o1' } }] }) },
      invoke: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    });
    const first = await api(request('/api/ai/agent', { prompt: 'confirm' }), new URL('http://localhost/api/ai/agent'));
    const previewId = (await first?.json()).parts.find((part: any) => part.type === 'approval').preview_id;
    const other = new Request('http://localhost/api/ai/agent/confirm', { method: 'POST', headers: { Authorization: 'Bearer other', 'x-user': 'u2', 'Content-Type': 'application/json' }, body: JSON.stringify({ preview_id: previewId }) });
    const response = await api(other, new URL(other.url));
    expect(response?.status).toBe(409);
  });
});
