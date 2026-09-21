import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Surveys certification report', () => {
  test('keeps the authenticated report page/API pair and passed-only entry point', () => {
    const page = yaml('pages/certification-report.yaml');
    const api = yaml('api/certification-report.yaml');
    const participantPage = yaml('pages/participant-detail.yaml');
    const report = api.actions.find((action: any) => action.action === 'surveys.certification.report');

    expect(page.page.id).toBe('survey-certification-report');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.auth.require).toEqual(['surveys.read']);
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'print_certification_report', permission: 'surveys.read' }));
    expect(api.datasources.map((source: any) => source.id)).toEqual(['survey_certification_report', 'survey_certification_report_runs']);
    expect(api.datasources[0].query).toContain("p.quiz_passed = true");
    expect(report).toMatchObject({ type: 'server', permission: 'surveys.read', operation: 'report', handler: 'yaml_mutation' });
    expect(report.mutation).toMatchObject({ operation: 'update', table: 'survey_certification_reports' });
    expect(report.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'SURVEY_CERTIFICATION_NOT_PASSED' }),
      expect.objectContaining({ status: 403, code: 'SURVEY_CERTIFICATION_REPORT_ACTOR' }),
    ]));
    expect(participantPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'view_certification_report', permission: 'surveys.read' }));
  });

  test('records one deterministic certification report across replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-certification-report-'));
    const path = join(directory, 'surveys.duckdb');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'surveys_certification_report_restart', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'surveys_certification_report_restart', ['schema', 'data']);

    const api = yaml('api/certification-report.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'survey_certification_report_runs');
    const mutation = api.actions.find((action: any) => action.action === 'surveys.certification.report').mutation;
    const request = { participant_id: 'participant-certification-2', requested_by: 'Admin User', current_user_name: 'Admin User' };
    const initial = await repository.querySource(source, { id: request.participant_id }, 0, 50);
    expect(initial.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'survey-certification-report-participant-certification-2-admin-user', score: 100 }),
    ]));

    const replayed = await repository.executeMutation(mutation, request);
    expect(replayed).toMatchObject({
      id: 'survey-certification-report-participant-certification-2-admin-user',
      participant_id: request.participant_id,
      requested_by: 'Admin User',
      certificate_title: 'MyCompany Vendor Certification',
      report_status: 'Ready',
    });
    const concurrent = await Promise.allSettled([
      repository.executeMutation(mutation, request),
      repository.executeMutation(mutation, request),
    ]);
    expect(concurrent.some((result) => result.status === 'fulfilled')).toBe(true);
    const count = await repository.query("SELECT COUNT(*) AS count FROM survey_certification_reports WHERE participant_id = 'participant-certification-2'");
    expect(count.at(0)?.count).toBe(1);
    first.close();

    const second = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(second);
    const rows = await reopened.querySource(source, { id: request.participant_id }, 0, 50);
    expect(rows.data).toHaveLength(1);
    expect(rows.data[0]).toMatchObject({ requested_by: 'Admin User', score: 100 });
    second.close();
    rmSync(directory, { recursive: true, force: true });
  });

  test('rejects failed certifications and actor spoofing without creating a report', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'surveys_certification_report_guards', ['schema', 'data']);
    const mutation = yaml('api/certification-report.yaml').actions.find((action: any) => action.action === 'surveys.certification.report').mutation;
    const valid = { participant_id: 'participant-certification-2', requested_by: 'Admin User', current_user_name: 'Admin User' };

    await expect(repository.executeMutation(mutation, { ...valid, participant_id: 'participant-certification-3' })).rejects.toMatchObject({ status: 404, code: 'SURVEY_CERTIFICATION_NOT_PASSED' });
    await expect(repository.executeMutation(mutation, { ...valid, requested_by: 'Morgan Taylor' })).rejects.toMatchObject({ status: 403, code: 'SURVEY_CERTIFICATION_REPORT_ACTOR' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM survey_certification_reports WHERE participant_id = 'participant-certification-3'")).at(0)?.count).toBe(0);
    database.close();
  });

  test('keeps the migration deterministic and replay-safe', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20261017000000-050-survey-certification-report.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).toContain('ON CONFLICT (id) DO NOTHING');
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});
