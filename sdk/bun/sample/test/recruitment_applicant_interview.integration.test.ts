import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/applicant-detail.yaml');
const action = api.actions.find((entry: any) => entry.id === 'schedule_recruitment_applicant_interview');

async function openRepository(path = ':memory:', name = `recruitment_applicant_interview_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, root + '/migrations', undefined, name, ['schema', 'data']);
  return { database, repository };
}

const values = {
  id: 'applicant-demo-003',
  expected_row_version: 1,
  current_user_name: 'Recruitment QA',
  current_company_name: 'Core3 Demo Company',
  name: 'First interview',
  start_at: '2026-01-22 09:00:00',
  end_at: '2026-01-22 10:00:00',
  location: 'Core3 HQ - Room 1',
  attendee_names: 'Emily Brooks, Recruitment QA',
};

describe('Recruitment applicant Schedule Interview parity', () => {
  test('traces Odoo action_create_meeting defaults and joins the page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_applicant.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const page = yaml('pages/applicant-detail.yaml');

    expect(sourceModel).toContain('def action_create_meeting(self):');
    expect(sourceModel).toContain("'default_applicant_id': self.id");
    expect(sourceModel).toContain("'default_name': self.partner_name");
    expect(sourceModel).toContain("calendar.action_calendar_event");
    expect(sourceView).toContain('name="action_create_meeting"');
    expect(sourceView).toContain('Schedule Interview');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((entry: any) => entry.id)).toContain('recruitment_applicant_meetings');
    expect(page.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: action.id, label: 'Schedule Interview' }));
    expect(page.components[0].notebook.tabs[0].components[0]).toMatchObject({ source: 'recruitment_applicant_meetings', parent_source: 'recruitment_applicant_detail' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'recruitment.write', operation: 'create', handler: 'yaml_mutation', title: 'Schedule Interview' });
    expect(action.fields.map((field: any) => field.field)).toEqual(['name', 'start_at', 'end_at', 'location', 'attendee_names']);
  });

  test('seeds Odoo-style meeting summary data and keeps the child datasource scoped', async () => {
    const { database, repository } = await openRepository();
    const detail = api.datasources.find((entry: any) => entry.id === 'recruitment_applicant_detail');
    const meetings = api.datasources.find((entry: any) => entry.id === 'recruitment_applicant_meetings');
    expect((await repository.querySource(detail, { id: 'applicant-demo-001', fixture_state: null, current_company_name: 'Core3 Demo Company' })).data)
      .toMatchObject({ meeting_count: 1, meeting_display_text: '1 Meeting', meeting_display_date: '2026-01-20' });
    expect((await repository.querySource(meetings, { id: 'applicant-demo-001', fixture_state: null, current_company_name: 'Core3 Demo Company' }, 0, 20)).data)
      .toMatchObject([{ name: 'Portfolio interview', applicant_name: 'Demo Candidate', location: 'Core3 HQ - Room 2', state: 'Scheduled' }]);
    expect((await repository.querySource(meetings, { id: 'applicant-demo-003', fixture_state: 'empty', current_company_name: 'Core3 Demo Company' }, 0, 20)).data).toEqual([]);
    await database.close();
  });

  test('schedules a durable interview, updates the applicant summary, and survives restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-applicant-interview-'));
    const path = join(directory, 'recruitment.duckdb');
    const first = await openRepository(path, `recruitment_applicant_interview_restart_${crypto.randomUUID().replaceAll('-', '_')}`);
    try {
      const created = await first.repository.executeMutation(action.mutation, values) as any;
      expect(created).toMatchObject({ id: 'recruitment-applicant-meeting-applicant-demo-003-1', applicant_id: 'applicant-demo-003', name: 'First interview', state: 'Scheduled', organizer: 'Recruitment QA', row_version: 1 });
      expect(await first.repository.query("SELECT applicant_id, name, CAST(start_at AS VARCHAR) AS start_at, location, attendee_names FROM recruitment_applicant_meetings WHERE applicant_id = 'applicant-demo-003'"))
        .toEqual([{ applicant_id: 'applicant-demo-003', name: 'First interview', start_at: '2026-01-22 09:00:00', location: 'Core3 HQ - Room 1', attendee_names: 'Emily Brooks, Recruitment QA' }]);
      expect(await first.repository.query("SELECT CAST(interview_date AS VARCHAR) AS interview_date, row_version FROM recruitment_applicants WHERE id = 'applicant-demo-003'"))
        .toEqual([{ interview_date: '2026-01-22', row_version: 2 }]);
    } finally {
      await first.database.close();
    }
    const second = await openRepository(path, `recruitment_applicant_interview_restart_reload_${crypto.randomUUID().replaceAll('-', '_')}`);
    try {
      expect(await second.repository.query("SELECT applicant_id, name, state FROM recruitment_applicant_meetings WHERE applicant_id = 'applicant-demo-003'"))
        .toEqual([{ applicant_id: 'applicant-demo-003', name: 'First interview', state: 'Scheduled' }]);
    } finally {
      await second.database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30000);

  test('enforces actor, company, active-row, time, duplicate, and stale guards atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      await expect(repository.executeMutation(action.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_APPLICANT_MEETING_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(action.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_APPLICANT_MEETING_COMPANY_FORBIDDEN' });
      await expect(repository.executeMutation(action.mutation, { ...values, name: '' })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_APPLICANT_MEETING_NAME_REQUIRED' });
      await expect(repository.executeMutation(action.mutation, { ...values, end_at: '2026-01-22 08:00:00' })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_APPLICANT_MEETING_TIME_INVALID' });
      await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_MEETING_STALE' });
      await repository.executeMutation(action.mutation, values);
      await expect(repository.executeMutation(action.mutation, values)).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_MEETING_STALE' });
      await expect(repository.executeMutation(action.mutation, { ...values, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_APPLICANT_MEETING_EXISTS' });
      expect(await repository.query("SELECT COUNT(*) AS count FROM recruitment_applicant_meetings WHERE applicant_id = 'applicant-demo-003'"))
        .toEqual([{ count: 1 }]);
    } finally {
      await database.close();
    }
  });
});
