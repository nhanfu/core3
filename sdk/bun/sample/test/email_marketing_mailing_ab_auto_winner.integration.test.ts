import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/mailing-detail.yaml');
const automaticWinner = api.actions.find((candidate: any) => candidate.id === 'send_ab_winner_email_mailing');

describe('Email Marketing automatic A/B winner parity', () => {
  test('maps Odoo action_send_winner_mailing to the detail page/API contract', () => {
    const page = yaml('pages/mailing-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py', 'utf8');
    const pageAction = page.components[0].header_actions.find((candidate: any) => candidate.id === 'send_ab_winner_email_mailing');

    expect(page.page.id).toBe('mailing-detail');
    expect(api.page.id).toBe('mailing-detail');
    expect(pageAction).toMatchObject({ id: 'send_ab_winner_email_mailing', label: 'Send Winner Now', permission: 'email_marketing.write' });
    expect(pageAction.show_if).toContain("ab_testing_variant_count >= 2");
    expect(pageAction.show_if).toContain("ab_testing_winner_selection !== 'manual'");
    expect(automaticWinner).toMatchObject({
      id: 'send_ab_winner_email_mailing',
      permission: 'email_marketing.write',
      action: 'mass_mailing.mailing.action_send_winner_mailing',
      refresh: ['email_mailing_detail', 'email_mailings'],
    });
    expect(automaticWinner.mutation.guards[3].query).toContain('ORDER BY CASE requested.ab_testing_winner_selection');
    expect(source).toMatch(/def action_send_winner_mailing\(self\):[\s\S]*return final_mailing\.action_select_as_winner\(\)/);
  });

  test('selects the configured highest-ratio sent variant and creates one durable queued winner', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_ab_auto_winner_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_ab_auto_winner_test', ['schema', 'data']);
    await repository.run("UPDATE email_mailings SET ab_testing_winner_selection = 'opened_ratio' WHERE ab_testing_group_id = 'email-ab-newsletter-001'");

    const result = await repository.executeMutation(automaticWinner.mutation, {
      id: 'email-mailing-ab-newsletter-b',
      expected_row_version: 1,
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
    expect(await repository.query("SELECT id, ab_testing_completed, row_version FROM email_mailings WHERE ab_testing_group_id = 'email-ab-newsletter-001' ORDER BY id")).toEqual([
      { id: 'email-mailing-ab-newsletter-a', ab_testing_completed: true, row_version: 2 },
      { id: 'email-mailing-ab-newsletter-b', ab_testing_completed: true, row_version: 2 },
      { id: 'email-mailing-ab-winner-email-mailing-ab-newsletter-a', ab_testing_completed: true, row_version: 1 },
    ]);
    database.close();
  });

  test('rejects stale, manual, completed, duplicate, and missing automatic winner requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_ab_auto_winner_guards', ['schema', 'data']);

    await expect(repository.executeMutation(automaticWinner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 0 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_AUTO_WINNER_STALE' });
    await repository.run("UPDATE email_mailings SET ab_testing_winner_selection = 'manual' WHERE id = 'email-mailing-ab-newsletter-a'");
    await expect(repository.executeMutation(automaticWinner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_AUTO_WINNER_BLOCKED' });
    await expect(repository.executeMutation(automaticWinner.mutation, { id: 'missing-mailing', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_AB_AUTO_WINNER_NOT_FOUND' });
    await repository.run("UPDATE email_mailings SET ab_testing_winner_selection = 'opened_ratio' WHERE id = 'email-mailing-ab-newsletter-a'");
    await repository.executeMutation(automaticWinner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 1 });
    await expect(repository.executeMutation(automaticWinner.mutation, { id: 'email-mailing-ab-newsletter-a', expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_AB_AUTO_WINNER_BLOCKED' });
    database.close();
  });

  test('keeps the automatic winner boundary deterministic and write-permissioned', () => {
    expect(automaticWinner.permission).toBe('email_marketing.write');
    expect(automaticWinner.mutation.steps[0].query).toContain("subject || ' (final)'");
    expect(readFileSync(join(serviceRoot, 'migrations/20260922200000-022-email-ab-winner.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
