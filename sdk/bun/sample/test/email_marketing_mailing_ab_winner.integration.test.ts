import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/mailing-detail.yaml');
const winner = api.actions.find((candidate: any) => candidate.id === 'select_ab_winner_email_mailing');

describe('Email Marketing A/B winner parity', () => {
  test('binds the Odoo winner action to the existing detail page/API contract', () => {
    const page = yaml('pages/mailing-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml', 'utf8');

    expect(page.page.id).toBe('mailing-detail');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe('mailing-detail');
    expect(discovered.pageDatasources.get('mailing-detail')).toContain('email_mailing_detail');
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'select_ab_winner_email_mailing', label: 'Send this as winner' }),
    ]));
    expect(winner).toMatchObject({
      type: 'server',
      permission: 'email_marketing.write',
      action: 'mass_mailing.mailing.action_select_as_winner',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(winner.mutation.fields).toEqual(['ab_testing_winner']);
    expect(source).toMatch(/name="action_select_as_winner"[\s\S]*Send this as winner/);
  });

  test('seeds two deterministic sent variants and selects one durable winner atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_ab_winner_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_ab_winner_test', ['schema', 'data']);

    expect(await repository.query("SELECT id, ab_testing_group_id, ab_testing_pc, ab_testing_completed FROM email_mailings WHERE ab_testing_group_id = 'email-ab-newsletter-001' ORDER BY id"))
      .toEqual([
        { id: 'email-mailing-ab-newsletter-a', ab_testing_group_id: 'email-ab-newsletter-001', ab_testing_pc: 50, ab_testing_completed: false },
        { id: 'email-mailing-ab-newsletter-b', ab_testing_group_id: 'email-ab-newsletter-001', ab_testing_pc: 50, ab_testing_completed: false },
      ]);

    const source = await repository.query('SELECT * FROM email_mailings WHERE id = ?', ['email-mailing-ab-newsletter-a']);
    const result = await repository.executeMutation(winner.mutation, {
      id: source[0].id,
      expected_row_version: source[0].row_version,
      values: { ab_testing_winner: true },
    }) as any;

    expect(result).toMatchObject({
      id: 'email-mailing-ab-winner-email-mailing-ab-newsletter-a',
      subject: 'Newsletter Variant A (final)',
      state: 'In Queue',
      ab_testing_group_id: 'email-ab-newsletter-001',
      ab_testing_pc: 100,
      ab_testing_completed: true,
      ab_testing_winner: true,
      ab_testing_parent_id: 'email-mailing-ab-newsletter-a',
      ab_testing_is_winner_mailing: true,
      row_version: 1,
    });
    expect(await repository.query('SELECT id, ab_testing_completed, ab_testing_winner, row_version FROM email_mailings WHERE ab_testing_group_id = ? ORDER BY id', ['email-ab-newsletter-001']))
      .toEqual([
        { id: 'email-mailing-ab-newsletter-a', ab_testing_completed: true, ab_testing_winner: true, row_version: 3 },
        { id: 'email-mailing-ab-newsletter-b', ab_testing_completed: true, ab_testing_winner: false, row_version: 2 },
        { id: 'email-mailing-ab-winner-email-mailing-ab-newsletter-a', ab_testing_completed: true, ab_testing_winner: true, row_version: 1 },
      ]);
    await expect(repository.executeMutation(winner.mutation, {
      id: source[0].id,
      expected_row_version: 3,
      values: { ab_testing_winner: true },
    })).rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_WINNER_BLOCKED' });
    database.close();
  });

  test('rejects stale, incomplete, non-manual, inactive, and missing winner selections without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_ab_winner_guards', ['schema', 'data']);

    await expect(repository.executeMutation(winner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 0, values: { ab_testing_winner: true } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_WINNER_STALE' });
    await expect(repository.executeMutation(winner.mutation, { id: 'missing-mailing', expected_row_version: 1, values: { ab_testing_winner: true } }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_AB_WINNER_NOT_FOUND' });

    await repository.run("UPDATE email_mailings SET ab_testing_winner_selection = 'opened_ratio' WHERE id = 'email-mailing-ab-newsletter-a'");
    await expect(repository.executeMutation(winner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 1, values: { ab_testing_winner: true } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_WINNER_BLOCKED' });
    expect(await repository.query("SELECT ab_testing_winner, ab_testing_completed FROM email_mailings WHERE id = 'email-mailing-ab-newsletter-a'"))
      .toEqual([{ ab_testing_winner: false, ab_testing_completed: false }]);
    database.close();
  });

  test('keeps the winner boundary permissioned and migration deterministic', () => {
    expect(winner.permission).toBe('email_marketing.write');
    expect(winner.refresh).toEqual(['email_mailing_detail', 'email_mailings']);
    expect(readFileSync(join(serviceRoot, 'migrations/20260922200000-022-email-ab-winner.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
    expect(readFileSync(join(serviceRoot, 'migrations/20260922201000-023-email-ab-winner-demo.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
