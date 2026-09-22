import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function openRepository(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await repository.run(`
    CREATE TABLE IF NOT EXISTS crm_leads(
      id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, type VARCHAR,
      stage VARCHAR, probability INTEGER DEFAULT 10, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crm_activities(
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR,
      activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP
    );
    INSERT OR IGNORE INTO crm_leads(id, name, type, stage, probability) VALUES
      ('won-opportunity', 'Qualified deal', 'opportunity', 'Qualified', 25),
      ('won-proposition', 'Proposed deal', 'opportunity', 'Proposition', 60),
      ('won-lead', 'Unconverted lead', 'lead', 'Qualified', 25),
      ('won-closed', 'Already won', 'opportunity', 'Won', 100),
      ('won-stale', 'Changed deal', 'opportunity', 'Proposition', 60);
    UPDATE crm_leads SET row_version = 2 WHERE id = 'won-stale';
  `);
  return { database, repository };
}

describe('CRM Won workflow parity CRM-LEAD-WON-WORKFLOW-001', () => {
  test('maps the Odoo Won action to the guarded page/API/workflow contract', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_lead_views.xml', 'utf8');
    const page = yaml('pages/lead-detail.yaml');
    const api = yaml('api/lead-detail.yaml');
    const workflow = yaml('pages/lead-workflow.yaml').workflow;
    const wonAction = action(api, 'mark_lead_won_detail');
    const won = workflow.transitions.find((transition: any) => transition.id === 'won');
    const header = page.components[0].header_actions.find((candidate: any) => candidate.id === 'mark_lead_won_detail');

    expect(source).toContain('name="action_set_won_rainbowman" string="Won"');
    expect(source).toContain("invisible=\"won_status == 'won' or type == 'lead' or not active\"");
    expect(wonAction).toMatchObject({
      action: 'crm.leads.won', permission: 'crm.write', handler: 'order_transition',
      workflow: 'crm_leads', operation: 'won',
      params: { id: '{state.id}', expected_row_version: '{state.row_version}' },
    });
    expect(header.show_if).toContain("type === 'opportunity'");
    expect(won).toMatchObject({ from: ['Proposition', 'Qualified'], to: 'Won', permission: 'crm.write' });
    expect(won.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'STALE_RECORD' }),
    ]));
    expect(won.mutation.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ query: expect.stringContaining("stage = 'Won'") }),
      expect.objectContaining({ query: expect.stringContaining('Opportunity marked won') }),
    ]));
    expect(() => validatePageDefinition({ ...page, actions: [...api.actions, ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('marks only an open opportunity won, records activity, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-won-workflow-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const won = yaml('pages/lead-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'won').mutation;

    const result = await first.repository.executeMutation(won, { id: 'won-opportunity', expected_row_version: 1 });
    expect(result).toMatchObject({ id: 'won-opportunity', stage: 'Won', probability: 100, row_version: 2 });
    expect(await first.repository.query("SELECT summary, state FROM crm_activities WHERE lead_id = 'won-opportunity'"))
      .toEqual([{ summary: 'Opportunity marked won', state: 'done' }]);
    await expect(first.repository.executeMutation(won, { id: 'won-lead', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(first.repository.executeMutation(won, { id: 'won-closed', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(first.repository.executeMutation(won, { id: 'won-stale', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await first.database.close();

    const second = await openRepository(databasePath);
    expect(await second.repository.query("SELECT stage, probability, row_version FROM crm_leads WHERE id = 'won-opportunity'"))
      .toEqual([{ stage: 'Won', probability: 100, row_version: 2 }]);
    expect(await second.repository.query("SELECT summary, state FROM crm_activities WHERE lead_id = 'won-opportunity'"))
      .toEqual([{ summary: 'Opportunity marked won', state: 'done' }]);
    await second.database.close();
    rmSync(databasePath, { force: true });
  });
});
