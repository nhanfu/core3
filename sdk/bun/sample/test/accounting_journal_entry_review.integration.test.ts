import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `accounting_journal_review_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Accounting Journal Entries Review action parity', () => {
  test('maps Odoo accountant_confirm_entries_action to page/API-bound actions', () => {
    const listPage = yaml('pages/journal-entries.yaml');
    const listApi = yaml('api/journal-entries.yaml');
    const detailPage = yaml('pages/journal-entry-detail.yaml');
    const detailApi = yaml('api/journal-entry-detail.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/account/models/account_move.py', 'utf8');
    const listAction = action(listApi, 'review_journal_entry');
    const detailAction = action(detailApi, 'review_journal_entry');

    expect(listPage.page.id).toBe('journal-entries');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(() => validatePageDefinition(listApi, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...listPage, actions: [...(listPage.actions ?? []), ...(listApi.actions ?? [])] }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detailPage, actions: [...(detailPage.actions ?? []), ...(detailApi.actions ?? [])] }, { allowExternalSources: true })).not.toThrow();
    expect(listPage.components[0].actions).toContainEqual(expect.objectContaining({ id: 'review_journal_entry', label: 'Reviewed', permission: 'accounting.write' }));
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'review_journal_entry', label: 'Reviewed', permission: 'accounting.write' }));
    expect(listAction).toMatchObject({ type: 'server', permission: 'accounting.write', action: 'accounting.journal_entries.review', handler: 'yaml_mutation', operation: 'review' });
    expect(detailAction).toMatchObject({ type: 'server', permission: 'accounting.write', action: 'accounting.journal_entries.review', handler: 'yaml_mutation', operation: 'review' });
    expect(detailAction.mutation.concurrency).toEqual({ required: true });
    expect(detailAction.mutation.steps[0].query).toContain('checked = TRUE');
    expect(sourceView).toContain('id="accountant_confirm_entries_action"');
    expect(sourceView).toContain('<field name="binding_view_types">list,kanban</field>');
    expect(sourceView).toContain('<field name="name">Review Entries</field>');
    expect(sourceView).toContain('model.check_selected_moves()');
    expect(sourceModel).toContain('def check_selected_moves(self):');
    expect(sourceModel).toContain('self.env[\'account.move\'].browse(self.env.context.get(\'active_ids\', [])).set_moves_checked()');
    expect(sourceModel).toContain("move.state == 'posted'");
  });

  test('marks an unchanged posted entry reviewed and rejects invalid attempts atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const detailApi = yaml('api/journal-entry-detail.yaml');
      const detail = detailApi.datasources[0];
      const review = action(detailApi, 'review_journal_entry');

      expect(await repository.querySource(detail, { id: 'accounting-entry-demo-001', fixture_state: null }, 0, 1)).toMatchObject({ data: { state: 'Posted', checked: false, row_version: 1 } });
      expect(await repository.executeMutation(review.mutation, { id: 'accounting-entry-demo-001', expected_row_version: 1 })).toMatchObject({ id: 'accounting-entry-demo-001', state: 'Posted', checked: true, row_version: 2 });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-entry-demo-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_JOURNAL_ENTRY_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-entry-demo-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_JOURNAL_ENTRY_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'accounting-review-demo-001', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_JOURNAL_ENTRY_REVIEW_UNAVAILABLE' });
      await expect(repository.executeMutation(review.mutation, { id: 'missing-journal-entry', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'ACCOUNTING_JOURNAL_ENTRY_REVIEW_NOT_FOUND' });
      expect(await repository.query('SELECT checked, row_version FROM accounting_journal_entries WHERE id = ?', ['accounting-entry-demo-001'])).toEqual([{ checked: true, row_version: 2 }]);
    } finally {
      await database.close();
    }
  });

  test('preserves the reviewed state through restart and migration replay', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-accounting-journal-review-'));
    const databasePath = join(tempDir, 'accounting.duckdb');
    const migrationName = `accounting_journal_review_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action(yaml('api/journal-entry-detail.yaml'), 'review_journal_entry').mutation, { id: 'accounting-entry-demo-001', expected_row_version: 1 });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      expect(await second.repository.query('SELECT checked, row_version FROM accounting_journal_entries WHERE id = ?', ['accounting-entry-demo-001'])).toEqual([{ checked: true, row_version: 2 }]);
      await migrateDatabase(second.repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT checked, row_version FROM accounting_journal_entries WHERE id = ?', ['accounting-entry-demo-001'])).toEqual([{ checked: true, row_version: 2 }]);
      await second.database.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
