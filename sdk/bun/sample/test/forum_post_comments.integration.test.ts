import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverForumPages } from './forum_test_support';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const actions = () => yaml('api/question-detail.yaml').actions;
const action = (id: string) => actions().find((entry: any) => entry.id === id);
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Forum post comments parity', () => {
  test('maps the Odoo post_comment route and comment template to the page/API pair', () => {
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_forum/controllers/website_forum.py', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_forum/models/forum_post.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_forum/views/forum_forum_templates_post.xml', 'utf8');
    const page = yaml('pages/question-detail.yaml');
    const api = yaml('api/question-detail.yaml');

    expect(controller).toContain("def post_comment(self, forum, post, **kwargs):");
    expect(controller).toContain("message_type='comment'");
    expect(controller).toContain('question._update_last_activity()');
    expect(model).toContain('last_activity_date');
    expect(template).toContain('Comment this post');
    expect(template).toContain('Add a comment');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'forum_post_comments')?.query).toContain('FROM forum_post_comments');
    expect(page.components[0]).toMatchObject({ message_source: 'forum_post_comments', message_action: 'add_forum_question_comment' });
    expect(action('add_forum_question_comment')).toMatchObject({
      permission: 'forum.write', action: 'forum.posts.comment', handler: 'order_chatter', operation: 'message',
    });
    expect(action('add_forum_answer_comment')).toMatchObject({ permission: 'forum.write', action: 'forum.answers.comment' });
  });

  test('seeds comments and adds durable comments to questions and answers atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'forum_post_comments_crud');
    const comments = yaml('api/question-detail.yaml').datasources.find((source: any) => source.id === 'forum_post_comments');
    const questionComment = action('add_forum_question_comment');
    const answer = action('add_forum_answer');
    const answerComment = action('add_forum_answer_comment');

    expect((await repository.querySource(comments, { id: 'forum-post-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'forum-comment-demo-001', actor_name: 'Developer C', detail: expect.stringContaining('migration discovery') })]));
    const question = await repository.executeMutation(questionComment.mutation, {
      id: 'forum-post-demo-001', target_id: 'forum-post-demo-001', expected_row_version: 1,
      target_expected_row_version: 1, current_user_id: 'forum-comment-user', current_user_name: 'Forum Commenter',
      values: { content: 'The manifest also keeps the action and page contracts discoverable.' },
    }) as any;
    expect(question).toMatchObject({
      id: 'forum-comment-forum-post-demo-001-2', question_id: 'forum-post-demo-001', post_id: 'forum-post-demo-001',
      actor_name: 'Forum Commenter', action: 'forum.posts.comment', action_label: 'Comment',
      detail: 'The manifest also keeps the action and page contracts discoverable.',
    });
    expect((await repository.query('SELECT row_version, last_activity_at FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0].row_version).toBe(2);

    const createdAnswer = await repository.executeMutation(answer.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-comment-answer-001', parent_expected_row_version: 2,
      current_user_id: 'answer-author', current_user_name: 'Answer Author', values: { content: 'A durable answer for comment testing.' },
    }) as any;
    const answerResult = await repository.executeMutation(answerComment.mutation, {
      id: 'forum-post-demo-001', target_id: createdAnswer.id, expected_row_version: 3,
      target_expected_row_version: createdAnswer.row_version, current_user_id: 'forum-comment-user', current_user_name: 'Forum Commenter',
      values: { content: 'This comment is attached to the answer.' },
    }) as any;
    expect(answerResult).toMatchObject({ question_id: 'forum-post-demo-001', post_id: createdAnswer.id, detail: 'This comment is attached to the answer.' });
    expect((await repository.query('SELECT row_version FROM forum_answers WHERE id = ?', [createdAnswer.id]))[0]).toEqual({ row_version: 2 });
    expect((await repository.querySource(comments, { id: 'forum-post-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ post_id: createdAnswer.id, detail: 'This comment is attached to the answer.' })]));
    await database.close();
  });

  test('rejects anonymous, blank, stale, closed, and unavailable targets without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'forum_post_comments_guards');
    const questionComment = action('add_forum_question_comment');
    const answer = action('add_forum_answer');
    const answerComment = action('add_forum_answer_comment');
    const base = {
      id: 'forum-post-demo-001', target_id: 'forum-post-demo-001', expected_row_version: 1,
      target_expected_row_version: 1, current_user_id: 'forum-comment-user', current_user_name: 'Forum Commenter',
      values: { content: 'A valid comment.' },
    };

    await expect(repository.executeMutation(questionComment.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'FORUM_COMMENT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(questionComment.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'FORUM_COMMENT_CONTENT_INVALID' });
    await expect(repository.executeMutation(questionComment.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'FORUM_COMMENT_PARENT_CHANGED' });
    await repository.query("UPDATE forum_posts SET state = 'Closed' WHERE id = 'forum-post-demo-001'");
    await expect(repository.executeMutation(questionComment.mutation, base)).rejects.toMatchObject({ status: 409, code: 'FORUM_COMMENT_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM forum_post_comments WHERE question_id = 'forum-post-demo-001'")).toEqual([{ count: 1 }]);

    await repository.query("UPDATE forum_posts SET state = 'Active', row_version = 1 WHERE id = 'forum-post-demo-001'");
    const createdAnswer = await repository.executeMutation(answer.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-comment-guard-answer', parent_expected_row_version: 1,
      current_user_id: 'answer-author', current_user_name: 'Answer Author', values: { content: 'Guard answer.' },
    }) as any;
    await repository.query("UPDATE forum_answers SET state = 'Flagged' WHERE id = 'forum-comment-guard-answer'");
    await expect(repository.executeMutation(answerComment.mutation, {
      id: 'forum-post-demo-001', target_id: createdAnswer.id, expected_row_version: 2,
      target_expected_row_version: 1, current_user_id: 'forum-comment-user', current_user_name: 'Forum Commenter', values: { content: 'No comment on a flagged answer.' },
    })).rejects.toMatchObject({ status: 409, code: 'FORUM_COMMENT_TARGET_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM forum_post_comments WHERE post_id = 'forum-comment-guard-answer'")).toEqual([{ count: 0 }]);
    await database.close();
  });

  test('survives migration replay and file-backed restart, and enforces forum.write at HTTP boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-forum-post-comments-'));
    const databasePath = join(directory, 'forum-comments.duckdb');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrate(firstRepository, 'forum_post_comments_restart');
      await migrate(firstRepository, 'forum_post_comments_restart');
      const questionComment = action('add_forum_question_comment');
      await firstRepository.executeMutation(questionComment.mutation, {
        id: 'forum-post-demo-002', target_id: 'forum-post-demo-002', expected_row_version: 1,
        target_expected_row_version: 1, current_user_id: 'restart-commenter', current_user_name: 'Restart Commenter',
        values: { content: 'This comment survives a restart.' },
      });
      await first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrate(secondRepository, 'forum_post_comments_restart');
      expect(await secondRepository.query("SELECT question_id, actor_name, content FROM forum_post_comments WHERE id = 'forum-comment-forum-post-demo-002-1'"))
        .toEqual([{ question_id: 'forum-post-demo-002', actor_name: 'Restart Commenter', content: 'This comment survives a restart.' }]);
      expect((await secondRepository.query("SELECT row_version FROM forum_posts WHERE id = 'forum-post-demo-002'"))[0]).toEqual({ row_version: 2 });

      const discovered = discoverForumPages();
      const user: any = { sub: 'restart-commenter', email: 'forum-comment@workspace.example', name: 'Restart Commenter', permissions: ['forum.write', 'forum.read'] };
      const api = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(actor: any, permission: string) { return actor.permissions.includes(permission); } },
        sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('forum_'))),
        pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'forum')),
        pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'forum').map(([id, page]) => [id, page.config])),
        catalogs: discovered.catalogs, menus: discovered.menus,
        workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.config])),
        workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'forum').map(([id, workflow]) => [id, workflow.file])),
        permissions: discovered.permissions.get('forum')?.config || {}, uploadRoot: '/tmp/core3-forum-post-comments-http', eventStore: {}, topics: {},
      });
      const response = await api(new Request('http://forum.test/api/actions/forum.posts.comment', {
        method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'forum-post-demo-002', target_id: 'forum-post-demo-002', expected_row_version: 2, target_expected_row_version: 2, content: 'HTTP comment' }),
      }), new URL('http://forum.test/api/actions/forum.posts.comment'));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ detail: 'HTTP comment', actor_name: 'Restart Commenter' });
      user.permissions = ['forum.read'];
      await expect(api(new Request('http://forum.test/api/actions/forum.posts.comment', {
        method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'forum-post-demo-002', target_id: 'forum-post-demo-002', expected_row_version: 3, target_expected_row_version: 3, content: 'Forbidden HTTP comment' }),
      }), new URL('http://forum.test/api/actions/forum.posts.comment'))).rejects.toMatchObject({ status: 403 });
      await second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
