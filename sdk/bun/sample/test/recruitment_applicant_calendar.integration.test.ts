import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Recruitment applicant Calendar parity', () => {
  test('maps the Odoo calendar view onto the existing applicants page/API contract', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const page = yaml('pages/applicants.yaml');
    const api = yaml('api/applicants.yaml');
    const calendar = page.components[0].views.find((view: any) => view.id === 'calendar');
    const source = api.datasources.find((item: any) => item.id === 'recruitment_applicants');

    expect(odoo).toContain('<record model="ir.ui.view" id="hr_applicant_calendar_view">');
    expect(odoo).toContain('date_start="activity_date_deadline"');
    expect(odoo).toContain('quick_create="0"');
    expect(page.datasources).toBeUndefined();
    expect(calendar).toMatchObject({ id: 'calendar', label: 'Calendar', icon: 'calendar', mobile: false, date_field: 'activity_date_deadline' });
    expect(calendar.card).toMatchObject({ title: 'name', subtitle: 'opening_name' });
    expect(calendar.card.fields.map((field: any) => field.field)).toEqual(['priority', 'activity_summary', 'recruiter']);
    expect(source).toMatchObject({ permission: 'recruitment.read', workflow: 'recruitment_applicants' });
    expect(source.query).toContain('activity_date_deadline');
    expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
  });

  test('renders only persisted scheduled activities with search, scope, empty, and workflow guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_calendar_test_schema_migrations', ['schema', 'data']);
    const api = yaml('api/applicants.yaml');
    const source = api.datasources.find((item: any) => item.id === 'recruitment_applicants');
    const workflow = yaml('pages/recruitment-workflow.yaml').workflow;

    const ready = await repository.querySource(source, { q: null, stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(ready.data.filter((row: any) => row.activity_date_deadline).map((row: any) => row.activity_date_deadline).sort()).toEqual(['2026-01-12', '2026-01-15', '2026-01-20']);
    expect((await repository.querySource(source, { q: 'Meldona', stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toMatchObject([{ activity_date_deadline: '2026-01-12', activity_summary: 'Confirm portfolio review' }]);
    expect((await repository.querySource(source, { q: 'does-not-exist', stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect(workflow.transitions.find((transition: any) => transition.id === 'interview')).toMatchObject({ permission: 'recruitment.write' });
    expect(workflow.transitions.find((transition: any) => transition.id === 'hire')).toMatchObject({ permission: 'recruitment.manage' });

    await repository.run("UPDATE recruitment_applicants SET activity_date_deadline = DATE '2026-01-21' WHERE id = 'applicant-demo-001'");
    expect((await repository.querySource(source, { q: 'Demo Candidate', stage: null, opening_name: null, priority: null, archived: null, current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toMatchObject([{ activity_date_deadline: '2026-01-21' }]);
    database.close();
  });

  test('keeps scheduled activity data durable across a database restart', async () => {
    const databasePath = join('/tmp', `core3-recruitment-calendar-${process.pid}.duckdb`);
    let database = await DuckDbDatabase.open(databasePath);
    try {
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_calendar_restart_migrations', ['schema', 'data']);
      await repository.run("UPDATE recruitment_applicants SET activity_summary = 'Calendar persistence check' WHERE id = 'applicant-demo-001'");
      database.close();

      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      expect(await repository.query("SELECT CAST(activity_date_deadline AS VARCHAR) AS activity_date_deadline, activity_summary FROM recruitment_applicants WHERE id = 'applicant-demo-001'"))
        .toEqual([{ activity_date_deadline: '2026-01-20', activity_summary: 'Calendar persistence check' }]);
    } finally {
      database.close();
      rmSync(databasePath, { force: true });
    }
  });
});
