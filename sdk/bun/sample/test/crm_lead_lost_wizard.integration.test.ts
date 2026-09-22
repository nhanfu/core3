import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function action(api: any, id: string) {
  return api.actions.find((candidate: any) => candidate.id === id);
}

function lostMutation() {
  return yaml('pages/lead-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'lost').mutation;
}

async function openRepository(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await repository.run(`
    CREATE TABLE IF NOT EXISTS crm_leads(
      id VARCHAR PRIMARY KEY, name VARCHAR, stage VARCHAR, lost_reason VARCHAR,
      probability INTEGER, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crm_lost_reasons(id VARCHAR PRIMARY KEY, active BOOLEAN);
    CREATE TABLE IF NOT EXISTS crm_activity_log(
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), actor_id VARCHAR, actor_name VARCHAR NOT NULL,
      action VARCHAR NOT NULL, resource VARCHAR NOT NULL, resource_id VARCHAR,
      detail VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO crm_lost_reasons VALUES ('reason-budget', true), ('reason-archived', false);
    INSERT OR IGNORE INTO crm_leads(id, name, stage, probability, row_version)
      VALUES ('lead-loss-wizard', 'Lost wizard lead', 'Proposition', 60, 1),
             ('lead-closed', 'Already closed', 'Won', 100, 1);
  `);
  return { database, repository };
}

describe('CRM lost lead wizard parity CRM-LEAD-LOST-WIZARD-001', () => {
  test('maps the Odoo Lost Lead modal into the lead-detail page/API join', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/wizard/crm_lead_lost_views.xml', 'utf8');
    const page = yaml('pages/lead-detail.yaml');
    const api = yaml('api/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const lost = action(api, 'mark_lead_lost_detail');

    expect(source).toContain('<form string="Lost Lead">');
    expect(source).toContain('field name="lost_reason_id"');
    expect(source).toContain('field name="lost_feedback"');
    expect(source).toContain('string="Mark as Lost"');
    expect(source).toContain('string="Discard"');
    expect(api.page).toEqual({ id: 'lead-detail' });
    expect(page.datasources).toBeUndefined();
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'mark_lead_lost_detail', label: 'Mark lost' }));
    expect(lost).toMatchObject({
      type: 'server_form', title: 'Lost Lead', submit_label: 'Mark as Lost', cancel_label: 'Discard',
      action: 'crm.leads.lost', permission: 'crm.write', operation: 'lost',
      params: { id: '{state.id}', expected_row_version: '{state.row_version}' },
    });
    expect(lost.fields).toEqual([
      { field: 'lost_reason', label: 'Lost reason', type: 'select', options_source: 'crm_lost_reason_lookup_detail', required: true },
      { field: 'lost_feedback', label: 'Closing Note', type: 'textarea', placeholder: 'What went wrong?' },
    ]);
    expect(() => validatePageDefinition({ ...page, actions: [...api.actions, ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('marks a lead lost, records the closing note, and preserves it after restart', async () => {
    const databasePath = `/tmp/core3-crm-lost-wizard-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const lost = lostMutation();

    const result = await first.repository.executeMutation(lost, {
      id: 'lead-loss-wizard', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { lost_reason: 'reason-budget', lost_feedback: 'Budget was not approved.' },
    });
    expect(result).toMatchObject({ id: 'lead-loss-wizard', stage: 'Lost', lost_reason: 'reason-budget', probability: 0, row_version: 2 });
    expect(await first.repository.query("SELECT actor_id, actor_name, action, resource, resource_id, detail FROM crm_activity_log WHERE resource_id = 'lead-loss-wizard'"))
      .toEqual([{
        actor_id: 'user-admin', actor_name: 'Admin User', action: 'crm.note', resource: 'crm_leads',
        resource_id: 'lead-loss-wizard', detail: 'Lost Comment: Budget was not approved.',
      }]);
    await first.database.close();

    const second = await openRepository(databasePath);
    expect(await second.repository.query("SELECT stage, lost_reason, row_version FROM crm_leads WHERE id = 'lead-loss-wizard'"))
      .toEqual([{ stage: 'Lost', lost_reason: 'reason-budget', row_version: 2 }]);
    expect(await second.repository.query("SELECT detail FROM crm_activity_log WHERE resource_id = 'lead-loss-wizard'"))
      .toEqual([{ detail: 'Lost Comment: Budget was not approved.' }]);
    await second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('rejects inactive reasons, stale rows, and closed leads without partial writes', async () => {
    const { database, repository } = await openRepository();
    const lost = lostMutation();
    const base = { id: 'lead-loss-wizard', expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Admin User' };

    await expect(repository.executeMutation(lost, { ...base, values: { lost_reason: 'reason-archived', lost_feedback: 'Should not write.' } }))
      .rejects.toMatchObject({ status: 400, message: 'Select an active lost reason' });
    await expect(repository.executeMutation(lost, { ...base, expected_row_version: 99, values: { lost_reason: 'reason-budget', lost_feedback: 'Stale note.' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(lost, { id: 'lead-closed', expected_row_version: 1, values: { lost_reason: 'reason-budget' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await repository.query("SELECT stage, lost_reason, row_version FROM crm_leads WHERE id IN ('lead-loss-wizard', 'lead-closed') ORDER BY id"))
      .toEqual([
        { stage: 'Won', lost_reason: null, row_version: 1 },
        { stage: 'Proposition', lost_reason: null, row_version: 1 },
      ]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM crm_activity_log')).toEqual([{ count: 0 }]);
    await database.close();
  });
});
