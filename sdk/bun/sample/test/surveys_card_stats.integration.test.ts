import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys Odoo kanban participant counters', () => {
  test('binds Odoo card counters to filtered participant navigation', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const card = list.views.find((view: any) => view.id === 'card');
    const source = api.datasources.find((candidate: any) => candidate.id === 'surveys');

    expect(card.card.fields).toEqual(expect.arrayContaining([
      { field: 'registered_count', label: 'Registered' },
      { field: 'completed_count', label: 'Completed' },
      { field: 'certified_count', label: 'Certified' },
    ]));
    expect(card.card.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_survey_registered_cards', label_field: 'registered_count', permission: 'surveys.read' }),
      expect.objectContaining({ id: 'open_survey_completed_cards', label_field: 'completed_count', permission: 'surveys.read' }),
      expect.objectContaining({ id: 'open_survey_certified_cards', label_field: 'certified_count', permission: 'surveys.read' }),
    ]));
    expect(String(source.query)).toContain('registered_count');
    expect(String(source.query)).toContain("p.state = 'Completed'");
    expect(String(source.query)).toContain('p.quiz_passed = true');
    expect(page.actions.find((action: any) => action.id === 'open_survey_registered_cards')).toMatchObject({
      navigate_to: '/surveys/participants', params: { survey_id: '{row.id}' }, permission: 'surveys.read',
    });
    expect(page.actions.find((action: any) => action.id === 'open_survey_completed_cards')).toMatchObject({
      navigate_to: '/surveys/participants', params: { survey_id: '{row.id}', state: 'Completed' }, permission: 'surveys.read',
    });
    expect(page.actions.find((action: any) => action.id === 'open_survey_certified_cards')).toMatchObject({
      navigate_to: '/surveys/participants', params: { survey_id: '{row.id}', quiz_status: 'Passed' }, permission: 'surveys.read',
    });
  });

  test('projects durable Odoo-style counts for seeded surveys', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_card_stats', ['schema', 'data']);
    const source = yaml('api/surveys.yaml').datasources.find((candidate: any) => candidate.id === 'surveys');
    const rows = await repository.querySource(source, { q: null, state: null, current_user_id: 'user-admin' }, 0, 50);
    expect(rows.data.find((row: any) => row.id === 'survey-demo-certification')).toMatchObject({
      registered_count: 4,
      completed_count: 4,
      certified_count: 2,
    });
    expect(rows.data.find((row: any) => row.id === 'survey-demo-feedback')).toMatchObject({
      registered_count: 6,
      completed_count: 4,
      certified_count: 1,
    });
    database.close();
  });
});
