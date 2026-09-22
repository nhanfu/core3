import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo kanban question count', () => {
  test('binds the Odoo Questions card metric to the page-matched datasource', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const card = list.views.find((view: any) => view.id === 'card');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');

    expect(card.card.fields).toContainEqual({ field: 'question_count', label: 'Questions' });
    expect(String(source.query)).toContain('question_count');
    expect(String(source.query)).toContain('COALESCE(q.is_page, false) = false');
    expect(source.permission).toBe('surveys.read');
    expect(api.page).toEqual({ id: 'surveys' });
    expect(page.page.id).toBe(api.page.id);
  });

  test('projects Odoo question_ids semantics and excludes section rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_questions', ['schema', 'data']);
    const source = yaml('api/surveys.yaml').datasources.find((candidate: any) => candidate.id === 'surveys');
    const rows = await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50);

    expect(rows.data.find((row: any) => row.id === 'survey-demo-feedback')).toMatchObject({ question_count: 7 });
    expect(rows.data.find((row: any) => row.id === 'survey-demo-certification')).toMatchObject({ question_count: 18 });
    expect(rows.data.find((row: any) => row.id === 'survey-demo-001')).toMatchObject({ question_count: 13 });
    expect(rows.data.find((row: any) => row.id === 'survey-demo-conditional')).toMatchObject({ question_count: 4 });

    await repository.run("INSERT INTO survey_questions(id, survey_id, question_text, question_type, sequence, required, is_page) VALUES ('question-card-count-section', 'survey-demo-feedback', 'Profile', 'Section', 99, false, true)");
    const refreshed = await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50);
    expect(refreshed.data.find((row: any) => row.id === 'survey-demo-feedback')).toMatchObject({ question_count: 7 });
    database.close();
  });
});
