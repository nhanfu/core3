import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (page: any, id: string) => page.actions.find((entry: any) => entry.id === id);

describe('CRM Merge Leads/Opportunities wizard parity', () => {
  test('maps Odoo action_merge_opportunities to the existing Leads page bulk action', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/crm/wizard/crm_merge_opportunities_views.xml', 'utf8');
    const page = yaml('pages/leads.yaml');
    const api = yaml('api/leads.yaml');
    const merge = action({ ...page, actions: api.actions }, 'merge_leads');

    expect(odoo).toContain('<record id="action_merge_opportunities" model="ir.actions.act_window">');
    expect(odoo).toContain('<field name="target">new</field>');
    expect(odoo).toContain('<form string="Merge Leads/Opportunities">');
    expect(odoo).toContain('<group string="Assign opportunities to">');
    expect(page.components[0].bulk_actions).toContainEqual({ id: 'merge_leads', label: 'Merge' });
    expect(merge).toMatchObject({
      type: 'server_form', title: 'Merge Leads/Opportunities', action: 'crm.leads.merge',
      permission: 'crm.write', operation: 'merge', submit_label: 'Merge', cancel_label: 'Cancel',
    });
    expect(merge.fields).toEqual([
      { field: 'user_id', label: 'Salesperson', type: 'select', options_source: 'crm_salespeople' },
      { field: 'team_id', label: 'Sales Team', type: 'select', options_source: 'crm_sales_teams' },
    ]);
    expect(() => validatePageDefinition({ ...page, actions: [...api.actions, ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('merges open records, applies wizard assignment, reparents activities, and keeps closed records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR,
        type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, source VARCHAR,
        salesperson VARCHAR, team VARCHAR, tags VARCHAR, utm_campaign VARCHAR, utm_medium VARCHAR, utm_source VARCHAR,
        expected_revenue INTEGER, stage VARCHAR, probability INTEGER, lost_reason VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR,
        summary VARCHAR, state VARCHAR, completed_at TIMESTAMP);
      CREATE TABLE crm_teams(name VARCHAR PRIMARY KEY, active BOOLEAN DEFAULT true);
      INSERT INTO crm_teams(name) VALUES ('Enterprise');
      INSERT INTO crm_leads(id, name, type, stage, probability, created_at) VALUES
        ('merge-closed', 'Closed', 'opportunity', 'Won', 100, TIMESTAMP '2026-01-15 09:00:00'),
        ('merge-survivor', 'Older opportunity', 'opportunity', 'New', 10, TIMESTAMP '2026-01-15 10:00:00'),
        ('merge-source', 'Lead to merge', 'lead', 'Qualified', 20, TIMESTAMP '2026-01-16 10:00:00');
      INSERT INTO crm_activities(id, lead_id, activity_type, summary, state)
        VALUES ('merge-activity', 'merge-source', 'Call', 'Follow up', 'planned');
    `);

    const merge = action(yaml('api/leads.yaml'), 'merge_leads');
    await expect(repository.executeMutation(merge.mutation, {
      selectedIds: ['merge-closed', 'merge-survivor', 'merge-source'],
      values: { team_id: 'Archived Team' },
    })).rejects.toMatchObject({ status: 400 });
    const merged = await repository.executeMutation(merge.mutation, {
      selectedIds: ['merge-closed', 'merge-survivor', 'merge-source'],
      values: { user_id: 'Sales User', team_id: 'Enterprise' },
    });
    expect(merged).toMatchObject({ id: 'merge-survivor', salesperson: 'Sales User', team: 'Enterprise', row_version: 3 });
    expect(await repository.query('SELECT id FROM crm_leads ORDER BY id')).toEqual([{ id: 'merge-closed' }, { id: 'merge-survivor' }]);
    expect(await repository.query('SELECT lead_id FROM crm_activities WHERE id = ?', ['merge-activity'])).toEqual([{ lead_id: 'merge-survivor' }]);

    await expect(repository.executeMutation(merge.mutation, { selectedIds: ['merge-survivor'] })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(merge.mutation, { selectedIds: ['merge-closed'] })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});
