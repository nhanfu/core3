import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Surveys certification badge', () => {
  test('keeps the authenticated badge page/API pair and passed-only participant entry point', () => {
    const page = yaml('pages/certification-badge.yaml');
    const api = yaml('api/certification-badge.yaml');
    const participantPage = yaml('pages/participant-detail.yaml');
    const award = api.actions.find((action: any) => action.action === 'surveys.certification.badge');

    expect(page.page.id).toBe('survey-certification-badge');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.auth.require).toEqual(['surveys.read']);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'award_certification_badge', permission: 'surveys.manage' }));
    expect(api.datasources.map((source: any) => source.id)).toEqual(['survey_certification_badge', 'survey_certification_badge_awards']);
    expect(api.datasources[0].query).toContain("p.quiz_passed = true");
    expect(award).toMatchObject({ type: 'server', permission: 'surveys.manage', operation: 'award', handler: 'yaml_mutation' });
    expect(award.mutation).toMatchObject({ operation: 'update', table: 'survey_certification_badges' });
    expect(award.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'SURVEY_CERTIFICATION_BADGE_NOT_PASSED' }),
      expect.objectContaining({ status: 403, code: 'SURVEY_CERTIFICATION_BADGE_ACTOR' }),
    ]));
    expect(participantPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_certification_badge', permission: 'surveys.read' }));
  });

  test('awards one deterministic badge across replay, concurrency, and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-certification-badge-'));
    const path = join(directory, 'surveys.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'surveys_certification_badge_restart', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'surveys_certification_badge_restart', ['schema', 'data']);

    const api = yaml('api/certification-badge.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'survey_certification_badge_awards');
    const mutation = api.actions.find((action: any) => action.action === 'surveys.certification.badge').mutation;
    const request = { participant_id: 'participant-certification-2', awarded_by: 'Admin User', current_user_name: 'Admin User' };
    const initial = await repository.querySource(source, { id: request.participant_id }, 0, 50);
    expect(initial.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'survey-certification-badge-participant-certification-2', badge_name: 'MyCompany Vendor Certification' }),
    ]));

    const awarded = await repository.executeMutation(mutation, request);
    expect(awarded).toMatchObject({
      id: 'survey-certification-badge-participant-certification-2',
      participant_id: request.participant_id,
      badge_description: 'Certification passed',
      badge_status: 'Awarded',
    });
    const concurrent = await Promise.allSettled([
      repository.executeMutation(mutation, request),
      repository.executeMutation(mutation, request),
    ]);
    expect(concurrent.some((result) => result.status === 'fulfilled')).toBe(true);
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_certification_badges WHERE participant_id = 'participant-certification-2'")).at(0)?.count).toBe(1);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const rows = await reopened.querySource(source, { id: request.participant_id }, 0, 50);
    expect(rows.data).toHaveLength(1);
    expect(rows.data[0]).toMatchObject({ awarded_by: 'Admin User', badge_name: 'MyCompany Vendor Certification' });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects failed certifications and actor spoofing without creating an award', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'surveys_certification_badge_guards', ['schema', 'data']);
    const mutation = yaml('api/certification-badge.yaml').actions.find((action: any) => action.action === 'surveys.certification.badge').mutation;
    const valid = { participant_id: 'participant-certification-2', awarded_by: 'Admin User', current_user_name: 'Admin User' };

    await expect(repository.executeMutation(mutation, { ...valid, participant_id: 'participant-certification-3' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_CERTIFICATION_BADGE_NOT_PASSED' });
    await expect(repository.executeMutation(mutation, { ...valid, awarded_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'SURVEY_CERTIFICATION_BADGE_ACTOR' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_certification_badges WHERE participant_id = 'participant-certification-3'")).at(0)?.count).toBe(0);
    database.close();
  });

  test('keeps the migration deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20261018000000-051-survey-certification-badge.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).toContain('ON CONFLICT (id) DO NOTHING');
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
