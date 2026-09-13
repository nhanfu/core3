import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/forum');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const actions = () => yaml('pages/question-detail.yaml').actions;

describe('Forum answer creation and moderation', () => {
  test('keeps authenticated author, parent relation, stale versions, and atomic writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'forum_answer_moderation', ['schema', 'data']);
    const add = actions().find((action: any) => action.id === 'add_forum_answer');
    const edit = actions().find((action: any) => action.id === 'edit_forum_answer');
    const accept = actions().find((action: any) => action.id === 'accept_forum_answer');
    const flag = actions().find((action: any) => action.id === 'flag_forum_answer');
    expect(add.permission).toBe('forum.write');
    expect(edit.permission).toBe('forum.write');
    expect(accept.permission).toBe('forum.manage');
    expect(flag.permission).toBe('forum.manage');

    const answer = await repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 1,
      current_user_name: 'Forum Participant',
      values: { content: 'Use a focused integration test.', author_name: 'Forum Participant' },
    });
    expect(answer).toMatchObject({ id: 'forum-answer-qa-001', post_id: 'forum-post-demo-001', author_name: 'Forum Participant', state: 'Active', row_version: 1 });
    expect((await repository.query('SELECT answer_count, row_version FROM forum_posts WHERE id = ?', ['forum-post-demo-001']))[0]).toEqual({ answer_count: 3, row_version: 2 });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Another User', values: { content: 'Spoofed edit' },
    })).rejects.toMatchObject({ status: 403, code: 'FORUM_ANSWER_FORBIDDEN' });
    expect((await repository.query('SELECT content, row_version FROM forum_answers WHERE id = ?', ['forum-answer-qa-001']))[0]).toEqual({ content: 'Use a focused integration test.', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Forum Participant', values: { content: 'Use a focused authenticated integration test.' },
    });
    expect(edited).toMatchObject({ content: 'Use a focused authenticated integration test.', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 2, expected_row_version: 1,
      current_user_name: 'Forum Participant', values: { content: 'Stale edit' },
    })).rejects.toMatchObject({ status: 409 });

    await expect(repository.executeMutation(add.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-invalid', parent_expected_row_version: 3,
      current_user_name: 'Forum Participant', values: { content: 'Wrong relation', author_name: 'Forum Participant', forum_id: 'wrong-forum' },
    })).rejects.toMatchObject({ status: 422, code: 'FORUM_ANSWER_RELATION_INVALID' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM forum_answers WHERE id = ?', ['forum-answer-invalid']))[0].count).toBe(0);

    const accepted = await repository.executeMutation(accept.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 3, expected_row_version: 2,
    });
    expect(accepted).toMatchObject({ state: 'Accepted', row_version: 3 });
    await expect(repository.executeMutation(flag.mutation, {
      id: 'forum-post-demo-001', line_id: 'forum-answer-qa-001', parent_expected_row_version: 4, expected_row_version: 3,
    })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
