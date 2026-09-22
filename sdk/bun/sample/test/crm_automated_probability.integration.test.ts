import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const parse = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const detailPage = () => {
  const page = parse('pages/lead-detail.yaml');
  for (const file of readdirSync(join(root, 'api')).filter((entry) => entry.endsWith('.yaml'))) {
    const fragment = parse(`api/${file}`);
    if (fragment.page?.id !== page.page?.id) continue;
    for (const key of ['datasources', 'actions']) {
      if (Array.isArray(fragment[key])) page[key] = [...(page[key] || []), ...fragment[key]];
    }
  }
  return page;
};
const action = (page: any, id: string) => page.actions.find((candidate: any) => candidate.id === id);

describe('CRM automated probability action parity CRM-LEAD-AUTOMATED-PROBABILITY-001', () => {
  test('maps Odoo action_set_automated_probability into the lead-detail page/API seam', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/models/crm_lead.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_lead_views.xml', 'utf8');
    const page = detailPage();
    const permissions = parse('permissions.yaml');
    const automated = action(page, 'set_automated_probability_detail');
    const header = page.components[0].header_actions.find((candidate: any) => candidate.id === automated.id);

    expect(source).toContain('def action_set_automated_probability(self):');
    expect(source).toContain("self.write({'probability': self.automated_probability})");
    expect(view).toContain('name="action_set_automated_probability"');
    expect(view).toContain("invisible=\"is_automated_probability or won_status == 'lost'\"");
    expect(automated).toMatchObject({
      action: 'crm.leads.set_automated_probability', permission: 'crm.write',
      handler: 'yaml_mutation', operation: 'set_automated_probability',
      params: { id: '{state.id}', expected_row_version: '{state.row_version}' },
    });
    expect(permissions.permissions).toContain('crm.write');
    expect(automated.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, code: 'STALE_RECORD' }),
    ]));
    expect(automated.mutation.steps[0].query).toContain('automated_probability');
    expect(header.show_if).toContain("stage !== 'Won'");
    expect(header.show_if).toContain("stage !== 'Lost'");
    expect(() => validatePageDefinition(page, { allowExternalSources: true })).not.toThrow();
  });

  test('restores the stage-derived probability, rejects stale/closed rows, and persists after restart', async () => {
    const databasePath = `/tmp/core3-crm-automated-probability-${crypto.randomUUID()}.duckdb`;
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(firstDatabase);
      await migrateDatabase(first, join(root, 'migrations'), undefined, 'crm_automated_probability_migrations', ['schema', 'data']);
      await first.run("UPDATE crm_leads SET probability = 15 WHERE id = 'crm-demo-001'");

      const mutation = action(detailPage(), 'set_automated_probability_detail').mutation;
      const result = await first.executeMutation(mutation, { id: 'crm-demo-001', expected_row_version: 1 });
      expect(result).toMatchObject({ id: 'crm-demo-001', stage: 'Proposition', probability: 60, automated_probability: 60, row_version: 2 });
      expect((await first.query("SELECT probability, automated_probability FROM crm_leads WHERE id = 'crm-demo-001'"))[0])
        .toEqual({ probability: 60, automated_probability: 60 });
      await expect(first.executeMutation(mutation, { id: 'crm-demo-001', expected_row_version: 1 }))
        .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
      await expect(first.executeMutation(mutation, { id: 'missing-lead', expected_row_version: 1 }))
        .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
      await first.run("UPDATE crm_leads SET stage = 'Won' WHERE id = 'crm-demo-001'");
      await expect(first.executeMutation(mutation, { id: 'crm-demo-001', expected_row_version: 2 }))
        .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(secondDatabase);
      expect((await second.query("SELECT probability, automated_probability, row_version FROM crm_leads WHERE id = 'crm-demo-001'"))[0])
        .toEqual({ probability: 60, automated_probability: 60, row_version: 2 });
      await secondDatabase.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
