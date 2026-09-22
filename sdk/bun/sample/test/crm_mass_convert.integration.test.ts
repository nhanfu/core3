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
  const result = new YamlRepository(database);
  await result.run(`
    CREATE TABLE IF NOT EXISTS crm_leads(
      id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, type VARCHAR,
      stage VARCHAR, salesperson VARCHAR, team VARCHAR,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crm_activities(
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR,
      activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crm_teams(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN DEFAULT true);
    CREATE TABLE IF NOT EXISTS crm_team_members(id VARCHAR PRIMARY KEY, team_id VARCHAR, user_name VARCHAR, active BOOLEAN DEFAULT true);
    INSERT OR IGNORE INTO crm_teams VALUES ('team-enterprise', 'Enterprise', true), ('team-archived', 'Archived', false);
    INSERT OR IGNORE INTO crm_team_members VALUES ('member-alice', 'team-enterprise', 'Alice', true);
    INSERT OR IGNORE INTO crm_leads(id, name, type, stage, salesperson, team) VALUES
      ('mass-lead-001', 'Mass lead one', 'lead', 'New', '', ''),
      ('mass-lead-002', 'Mass lead two', 'lead', 'Qualified', 'Existing owner', 'Enterprise'),
      ('mass-opportunity', 'Already opportunity', 'opportunity', 'New', '', ''),
      ('mass-closed', 'Closed lead', 'lead', 'Won', '', '');
  `);
  return { database, repository: result };
}

describe('CRM mass lead conversion wizard parity CRM-LEAD-MASS-CONVERT-001', () => {
  test('maps Odoo list/kanban action to the YAML page/API join and preserves guarded wizard fields', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/wizard/crm_lead_to_opportunity_mass_views.xml', 'utf8');
    const page = yaml('pages/leads.yaml');
    const api = yaml('api/leads.yaml');
    const list = page.components[0];
    const convert = action(api, 'convert_leads_mass');

    expect(source).toContain('id="action_crm_send_mass_convert"');
    expect(source).toContain('binding_view_types">list,kanban</field>');
    expect(source).toContain('Convert to Opportunities');
    expect(api.page.id).toBe(page.page.id);
    expect(list.bulk_actions).toContainEqual({ id: 'convert_leads_mass', label: 'Convert to opportunities', permission: 'crm.write' });
    expect(convert).toMatchObject({
      type: 'server_form', title: 'Convert to Opportunity', submit_label: 'Convert to Opportunities',
      action: 'crm.leads.mass_convert', permission: 'crm.write', operation: 'mass_convert',
    });
    expect(convert.fields).toEqual([
      { field: 'user_id', label: 'Salesperson', type: 'select', options_source: 'crm_salespeople' },
      { field: 'team_id', label: 'Sales Team', type: 'select', options_source: 'crm_sales_teams' },
      { field: 'force_assignment', label: 'Force assignment', type: 'checkbox', default: false },
    ]);
    expect(() => validatePageDefinition({ ...page, actions: [...api.actions, ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('converts selected open leads atomically, assigns the wizard values, and records activities', async () => {
    const { database, repository } = await openRepository();
    const convert = action(yaml('api/leads.yaml'), 'convert_leads_mass');

    const result = await repository.executeMutation(convert.mutation, {
      selectedIds: ['mass-lead-001', 'mass-lead-002'],
      values: { user_id: 'Alice', team_id: 'Enterprise', force_assignment: true },
    }) as any;

    expect(result).toEqual({ converted_count: 2 });
    expect(await repository.query("SELECT id, type, salesperson, team, row_version FROM crm_leads WHERE id IN ('mass-lead-001', 'mass-lead-002') ORDER BY id")).toEqual([
      { id: 'mass-lead-001', type: 'opportunity', salesperson: 'Alice', team: 'Enterprise', row_version: 2 },
      { id: 'mass-lead-002', type: 'opportunity', salesperson: 'Alice', team: 'Enterprise', row_version: 2 },
    ]);
    expect((await repository.query("SELECT COUNT(*) AS count FROM crm_activities WHERE lead_id IN ('mass-lead-001', 'mass-lead-002')"))[0]).toEqual({ count: 2 });

    await expect(repository.executeMutation(convert.mutation, { selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'CRM_MASS_CONVERT_SELECTION_REQUIRED' });
    await expect(repository.executeMutation(convert.mutation, { selectedIds: ['mass-opportunity'] })).rejects.toMatchObject({ status: 409, code: 'CRM_MASS_CONVERT_SELECTION_INVALID' });
    await expect(repository.executeMutation(convert.mutation, { selectedIds: ['missing-lead'] })).rejects.toMatchObject({ status: 409, code: 'CRM_MASS_CONVERT_SELECTION_INVALID' });
    await expect(repository.executeMutation(convert.mutation, { selectedIds: ['mass-lead-001'], values: { team_id: 'Archived' } })).rejects.toMatchObject({ status: 400, code: 'CRM_MASS_CONVERT_TEAM_INVALID' });
    await expect(repository.executeMutation(convert.mutation, { selectedIds: ['mass-closed'] })).rejects.toMatchObject({ status: 409, code: 'CRM_MASS_CONVERT_SELECTION_INVALID' });
    await database.close();
  });

  test('does not partially convert a selection when a later selected row is invalid', async () => {
    const { database, repository } = await openRepository();
    const convert = action(yaml('api/leads.yaml'), 'convert_leads_mass');

    await expect(repository.executeMutation(convert.mutation, { selectedIds: ['mass-lead-001', 'mass-closed'], values: { user_id: 'Alice' } }))
      .rejects.toMatchObject({ status: 409, code: 'CRM_MASS_CONVERT_SELECTION_INVALID' });
    expect(await repository.query("SELECT id, type, row_version FROM crm_leads WHERE id IN ('mass-lead-001', 'mass-closed') ORDER BY id")).toEqual([
      { id: 'mass-closed', type: 'lead', row_version: 1 },
      { id: 'mass-lead-001', type: 'lead', row_version: 1 },
    ]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM crm_activities')).toEqual([{ count: 0 }]);
    await database.close();
  });

  test('keeps converted rows and activities after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-crm-mass-convert-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const convert = action(yaml('api/leads.yaml'), 'convert_leads_mass');
    await first.repository.executeMutation(convert.mutation, {
      selectedIds: ['mass-lead-001'], values: { user_id: 'Alice', team_id: 'Enterprise' },
    });
    await first.database.close();

    const second = await openRepository(databasePath);
    expect(await second.repository.query("SELECT type, salesperson, team, row_version FROM crm_leads WHERE id = 'mass-lead-001'"))
      .toEqual([{ type: 'opportunity', salesperson: 'Alice', team: 'Enterprise', row_version: 2 }]);
    expect(await second.repository.query("SELECT summary, state FROM crm_activities WHERE lead_id = 'mass-lead-001'"))
      .toEqual([{ summary: 'Lead converted to opportunity', state: 'done' }]);
    await second.database.close();
    rmSync(databasePath, { force: true });
  });
});
