import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
      id: 'applicant-demo-003', expected_row_version: 1, refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
    });
    expect(refused).toMatchObject({ id: 'applicant-demo-003', stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate' });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, row_version FROM recruitment_applicants WHERE id = ?', ['applicant-demo-003'])).toEqual([
      { stage: 'Rejected', archived: true, refuse_reason_id: 'refuse-reason-duplicate', row_version: 2 },
    ]);
    await expect(repository.executeMutation(action.mutation, {
      id: 'applicant-demo-002', expected_row_version: 1, refuse_reason_id: 'missing-reason', values: { refuse_reason_id: 'missing-reason' },
    })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_REFUSE_REASON_INVALID' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'applicant-demo-003', expected_row_version: 1, refuse_reason_id: 'refuse-reason-duplicate', values: { refuse_reason_id: 'refuse-reason-duplicate' },
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
    expect(reopen.params).toEqual({ id: '{state.id}', expected_row_version: '{state.recruitment_applicant_detail.row_version}' });
    expect(workflow.transitions.find((transition: any) => transition.id === 'reopen')).toMatchObject({ from: ['Rejected'], to: 'New', permission: 'recruitment.write' });

    const transition = workflow.transitions.find((candidate: any) => candidate.id === 'reopen');
    const restored = await repository.executeMutation(transition.mutation, { id: 'applicant-demo-004', expected_row_version: 1 });
    expect(restored).toMatchObject({ id: 'applicant-demo-004', stage: 'New', archived: false, refuse_reason_id: null, refused_date: null, row_version: 2 });
    expect(await repository.query('SELECT stage, archived, refuse_reason_id, refused_date, row_version FROM recruitment_applicants WHERE id = ?', ['applicant-demo-004'])).toEqual([
      { stage: 'New', archived: false, refuse_reason_id: null, refused_date: null, row_version: 2 },
    ]);
    await expect(repository.executeMutation(transition.mutation, { id: 'applicant-demo-004', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_REOPEN_STALE' });
    database.close();
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
});
