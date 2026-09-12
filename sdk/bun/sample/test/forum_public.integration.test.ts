import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ForumModule from '../services/forum/module';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Forum public question boundary', () => {
  test('exposes only active and closed questions through public routes', async () => {
    const module = new ForumModule();
    const calls: Array<{ operation: string; request: any }> = [];
    const service = { async call(operation: string, request: any) { calls.push({ operation, request }); return operation.endsWith('.question') ? { questions: request.id === 'forum-post-demo-001' ? [{ id: request.id, state: 'Active', title: 'How do I add a new YAML service?' }] : [] } : { questions: [{ id: 'forum-post-demo-001', state: 'Active' }] }; } };
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://forum.test${path}`, init), new URL(`http://forum.test${path}`), service);
    expect((await (await route('/api/public/forum/questions')).json())).toEqual({ questions: [{ id: 'forum-post-demo-001', state: 'Active' }] });
    expect((await (await route('/api/public/forum/questions/forum-post-demo-001')).json())).toMatchObject({ question: { state: 'Active' } });
    expect((await route('/api/public/forum/questions/forum-post-demo-flagged'))?.status).toBe(404);
    expect((await route('/api/public/forum/questions', { method: 'POST' }))?.status).toBe(405);
    expect(calls).toEqual([
      { operation: 'forum.public.questions', request: { q: null } },
      { operation: 'forum.public.question', request: { id: 'forum-post-demo-001' } },
      { operation: 'forum.public.question', request: { id: 'forum-post-demo-flagged' } },
    ]);
  });

  test('declares a Fluent public Forum question renderer and state-safe query', () => {
    const operations = yaml('operations.yaml').operations;
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicForumQuestion.ts'), 'utf8');
    const app = readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8');
    expect(operations['forum.public.questions'].query).toContain("state IN ('Active', 'Closed')");
    expect(operations['forum.public.question'].query).toContain("state IN ('Active', 'Closed')");
    expect(renderer).toContain("@core3/client/html");
    expect(renderer).toContain('/api/public/forum/questions/');
    expect(app).toContain('/^\\/forum\\/question\\/?$/');
  });
});
