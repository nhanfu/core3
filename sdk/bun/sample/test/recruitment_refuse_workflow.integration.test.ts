import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Recruitment refusal workflow', () => {
  test('refuses an open applicant with a reason and rejects invalid or stale replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_refuse_workflow_test', ['schema', 'data']);
    const action = yaml('api/applicant-detail.yaml').actions.find((candidate: any) => candidate.id === 'reject_applicant_detail');

    const refused = await repository.executeMutation(action.mutation, {
      id: 'applicant-demo-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company', refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
    });
    expect(refused).toMatchObject({ id: 'applicant-demo-003', stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate' });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, row_version FROM recruitment_applicants WHERE id = ?', ['applicant-demo-003'])).toEqual([
      { stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate', row_version: 2 },
    ]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'applicant-demo-002', expected_row_version: 1, refuse_reason_id: 'missing-reason', values: { refuse_reason_id: 'missing-reason' },
    })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_REFUSE_REASON_INVALID' });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, row_version FROM recruitment_applicants WHERE id = ?', ['applicant-demo-002'])).toEqual([
      { stage: 'Screening', archived: false, refuse_reason_id: null, row_version: 1 },
    ]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'applicant-demo-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company', refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
    })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REFUSE_STALE' });
    database.close();
  });

  test('restores a refused applicant to New, persists across reload, and is available to recruitment users', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_reopen_workflow_test', ['schema', 'data']);
    const detail = yaml('api/applicant-detail.yaml');
    const workflow = yaml('pages/recruitment-workflow.yaml').workflow;
    const reopen = detail.actions.find((candidate: any) => candidate.id === 'reopen_applicant_detail');

    expect(reopen).toMatchObject({ permission: 'recruitment.write', action: 'recruitment.applicants.reopen', operation: 'reopen' });
    expect(reopen.params).toEqual({ id: '{state.id}' });
    expect(reopen.params).not.toHaveProperty('expected_row_version');
    expect(workflow.transitions.find((transition: any) => transition.id === 'reopen')).toMatchObject({ from: ['Rejected'], to: 'New', permission: 'recruitment.write' });

    const transition = workflow.transitions.find((candidate: any) => candidate.id === 'reopen');
    const refuse = detail.actions.find((candidate: any) => candidate.id === 'reject_applicant_detail');
    const refused = await repository.executeMutation(refuse.mutation, {
      id: 'applicant-demo-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
    });
    expect(refused).toMatchObject({ stage: 'Rejected', archived: true, row_version: 2 });
    const restored = await repository.executeMutation(transition.mutation, { id: 'applicant-demo-003', expected_row_version: 2, current_company_name: 'Core3 Demo Company' });
    expect(restored).toMatchObject({ id: 'applicant-demo-003', stage: 'New', archived: false, refuse_reason_id: null, refused_date: null, row_version: 3 });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, refused_date, row_version FROM recruitment_applicants WHERE id = ?', ['applicant-demo-003'])).toEqual([
      { stage: 'New', archived: false, refuse_reason_id: null, refused_date: null, row_version: 3 },
    ]);
    await expect(repository.executeMutation(transition.mutation, { id: 'applicant-demo-003', expected_row_version: 2, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REOPEN_STALE' });
    const reloaded = await repository.querySource(detail.datasources[0], { id: 'applicant-demo-003', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 1);
    expect(reloaded.data).toMatchObject({ id: 'applicant-demo-003', stage: 'New', archived: false, company_name: 'Core3 Demo Company', row_version: 3 });
    database.close();
  });

  test('persists refusal and reopen across a file-backed database restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-restart-'));
    const databasePath = join(directory, 'recruitment.duckdb');
    const migrationName = `recruitment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database = await DuckDbDatabase.open(databasePath);
    try {
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const detail = yaml('api/applicant-detail.yaml');
      const refuse = detail.actions.find((candidate: any) => candidate.id === 'reject_applicant_detail');
      const reopen = yaml('pages/recruitment-workflow.yaml').workflow.transitions.find((candidate: any) => candidate.id === 'reopen');

      await repository.executeMutation(refuse.mutation, {
        id: 'applicant-demo-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
        refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
      });
      database.close();

      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await repository.query("SELECT stage, archived, refuse_reason_id, row_version, company_name FROM recruitment_applicants WHERE id = 'applicant-demo-003'"))[0])
        .toEqual({ stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate', row_version: 2, company_name: 'Core3 Demo Company' });

      await repository.executeMutation(reopen.mutation, { id: 'applicant-demo-003', expected_row_version: 2, current_company_name: 'Core3 Demo Company' });
      database.close();

      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      expect((await repository.query("SELECT stage, archived, refuse_reason_id, row_version FROM recruitment_applicants WHERE id = 'applicant-demo-003'"))[0])
        .toEqual({ stage: 'New', archived: false, refuse_reason_id: null, row_version: 3 });
      await expect(repository.executeMutation(reopen.mutation, { id: 'applicant-demo-003', expected_row_version: 2, current_company_name: 'Core3 Demo Company' }))
        .rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REOPEN_STALE' });
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('uses the required refusal dialog from the applicant list action', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_list_refuse_workflow_test', ['schema', 'data']);
    const api = yaml('api/applicants.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'reject_applicant');
    const reasonLookup = api.datasources.find((candidate: any) => candidate.id === 'recruitment_applicant_list_refuse_reason_lookup');

    expect(action).toMatchObject({ type: 'server_form', permission: 'recruitment.manage', action: 'recruitment.applicants.refuse_with_reason', operation: 'refuse' });
    expect(action.params).toEqual({ id: '{row.id}', expected_row_version: '{row.row_version}' });
    expect(action.fields).toEqual([{ field: 'refuse_reason_id', label: 'Reason', type: 'select', options_source: 'recruitment_applicant_list_refuse_reason_lookup', required: true }]);
    expect(reasonLookup).toMatchObject({ permission: 'recruitment.read', single: false });

    const refused = await repository.executeMutation(action.mutation, {
      id: 'applicant-demo-002', expected_row_version: 1, refuse_reason_id: 'refuse-reason-spam', values: { refuse_reason_id: 'refuse-reason-spam' },
    });
    expect(refused).toMatchObject({ stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-spam', row_version: 2 });
    expect(await repository.query('SELECT CAST(refused_date AS VARCHAR) AS refused_date FROM recruitment_applicants WHERE id = ?', ['applicant-demo-002'])).toEqual([{ refused_date: '2026-01-15' }]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'applicant-demo-002', expected_row_version: 1, refuse_reason_id: 'refuse-reason-spam', values: { refuse_reason_id: 'refuse-reason-spam' },
    })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REFUSE_STALE' });
    database.close();
  });

  test('enforces company scope and actor contracts without leaking or partially mutating applicants', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_applicant_scope_test', ['schema', 'data']);
    await repository.run("UPDATE recruitment_applicants SET company_name = 'Other Company' WHERE id IN ('applicant-demo-003', 'applicant-demo-004')");

    const detail = yaml('api/applicant-detail.yaml');
    const list = yaml('api/applicants.yaml');
    const refuse = detail.actions.find((candidate: any) => candidate.id === 'reject_applicant_detail');
    const reopen = detail.actions.find((candidate: any) => candidate.id === 'reopen_applicant_detail');
    const workflow = yaml('pages/recruitment-workflow.yaml').workflow;
    const reopenTransition = workflow.transitions.find((candidate: any) => candidate.id === 'reopen');

    expect(list.datasources.find((candidate: any) => candidate.id === 'recruitment_applicants').error_states).toMatchObject({
      unauthorized: { status: 401 }, forbidden: { status: 403 },
    });
    expect(detail.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 } });
    expect(refuse.permission).toBe('recruitment.manage');
    expect(reopen.permission).toBe('recruitment.write');
    expect(refuse.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RECRUITMENT_APPLICANT_COMPANY_SCOPE_REQUIRED', status: 403 }),
    ]));
    expect(reopenTransition.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RECRUITMENT_APPLICANT_COMPANY_SCOPE_REQUIRED', status: 403 }),
    ]));

    const scopedList = await repository.querySource(list.datasources.find((candidate: any) => candidate.id === 'recruitment_applicants'), {
      q: null, stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(scopedList.data.some((row: any) => row.id === 'applicant-demo-003')).toBe(false);
    expect((await repository.querySource(detail.datasources[0], { id: 'applicant-demo-003', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});

    await expect(repository.executeMutation(refuse.mutation, {
      id: 'applicant-demo-003', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { refuse_reason_id: 'refuse-reason-spam' },
    })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_APPLICANT_COMPANY_SCOPE_REQUIRED' });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, row_version, company_name FROM recruitment_applicants WHERE id = ?', ['applicant-demo-003'])).toEqual([
      { stage: 'Interview', archived: false, refuse_reason_id: null, row_version: 1, company_name: 'Other Company' },
    ]);

    await expect(repository.executeMutation(reopenTransition.mutation, {
      id: 'applicant-demo-004', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
    })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_APPLICANT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(reopenTransition.mutation, {
      id: 'applicant-demo-004', expected_row_version: 1, current_company_name: 'Other Company',
    })).resolves.toMatchObject({ stage: 'New', archived: false, row_version: 2 });
    await expect(repository.executeMutation(reopenTransition.mutation, {
      id: 'applicant-demo-004', expected_row_version: 1, current_company_name: 'Other Company',
    })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REOPEN_STALE' });
    database.close();
  });
});
