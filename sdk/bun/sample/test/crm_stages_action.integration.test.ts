import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const crmRoot = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => {
  const page = Bun.YAML.parse(readFileSync(join(crmRoot, file), 'utf8')) as any;
  const pageId = page.page?.id;
  if (!pageId || !file.startsWith('pages/')) return page;
  for (const apiFile of readdirSync(join(crmRoot, 'api')).filter((entry) => entry.endsWith('.yaml'))) {
    const api = Bun.YAML.parse(readFileSync(join(crmRoot, 'api', apiFile), 'utf8')) as any;
    if (api.page?.id !== pageId) continue;
    for (const key of ['datasources', 'actions']) {
      if (Array.isArray(api[key])) page[key] = [...(page[key] || []), ...api[key]];
    }
  }
  return page;
};

const action = (page: any, id: string) => page.actions.find((candidate: any) => candidate.id === id);

describe('CRM Odoo stage action parity', () => {
  it('discovers the separated list/detail contracts and supports guarded stage lifecycle', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'crm_stage_action_migrations', ['schema', 'data']);

    expect((await repository.query("SELECT version FROM crm_stage_action_migrations WHERE version = '0.0.23'")).length).toBe(1);
    const list = yaml('pages/stages.yaml');
    const detail = yaml('pages/crm-stage-detail.yaml');
    expect(list.page).toMatchObject({ id: 'crm-stages', route: '/crm/stages' });
    expect(detail.page).toMatchObject({ id: 'crm-stage-detail', route: '/crm/stages/detail' });
    expect(list.datasources.map((source: any) => source.id)).toContain('crm_stage_action');
    expect(detail.datasources.map((source: any) => source.id)).toContain('crm_stage_detail');
    expect(list.components[0].form_view.page).toContain('crm-stage-detail.yaml');

    const created = await repository.executeMutation(action(list, 'create_crm_stage_action').mutation, {
      name: 'Discovery', sequence: 2, probability: 20, fold: false, color: 3,
      team_names: 'Enterprise', is_won: false, rotting_threshold_days: 7, requirements: 'Confirm fit',
    });
    expect(created).toMatchObject({ name: 'Discovery', probability: 20, color: 3, team_names: 'Enterprise' });

    await repository.run("INSERT INTO crm_leads(id, name, stage, probability, row_version) VALUES ('stage-lead', 'Stage lead', 'Discovery', 20, 1)");
    const updated = await repository.executeMutation(action(detail, 'edit_crm_stage_action').mutation, {
      id: created.id, expected_row_version: created.row_version, name: 'Evaluation', sequence: 3, probability: 40,
      fold: true, color: 5, team_names: 'Enterprise, North America', is_won: false,
      rotting_threshold_days: 14, requirements: 'Confirm budget',
    });
    expect(updated).toMatchObject({ name: 'Evaluation', probability: 40, fold: true, color: 5 });
    expect((await repository.query("SELECT stage, probability, row_version FROM crm_leads WHERE id = 'stage-lead'"))[0]).toMatchObject({ stage: 'Evaluation', probability: 40, row_version: 2 });

    await expect(repository.executeMutation(action(detail, 'edit_crm_stage_action').mutation, {
      id: created.id, expected_row_version: updated.row_version, name: 'Evaluation', sequence: 3, probability: 101,
      fold: true, color: 5, team_names: 'Enterprise', is_won: false, rotting_threshold_days: 14, requirements: 'Bad',
    })).rejects.toMatchObject({ status: 422 });
    await expect(repository.executeMutation(action(list, 'create_crm_stage_action').mutation, { name: 'evaluation', probability: 10 })).rejects.toMatchObject({ status: 409 });
  });
});
