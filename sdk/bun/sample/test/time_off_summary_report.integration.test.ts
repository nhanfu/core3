import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = () => yaml('api/report-by-employee.yaml').actions.find((candidate: any) => candidate.id === 'print_time_off_summary');

async function openRepository(databasePath = ':memory:', migrationName = `time_off_summary_report_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

describe('Time Off Summary QWeb PDF report action parity', () => {
  test('maps Odoo action_report_holidayssummary to the existing page/API Summary wizard', () => {
    const page = yaml('pages/report-by-employee.yaml');
    const api = yaml('api/report-by-employee.yaml');
    const sourceReport = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_holidays_reports.xml', 'utf8');
    const sourceTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_holidays_templates.xml', 'utf8');
    const report = action();
    const history = api.datasources.find((candidate: any) => candidate.id === 'time_off_summary_runs');

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(['time_off_report_states', 'time_off_summary_types', 'time_off_employee_report', 'time_off_summary_runs']);
    expect(report).toMatchObject({
      type: 'server_form', permission: 'time_off.read', action: 'time_off.summary.print',
      handler: 'yaml_mutation', operation: 'print_report', title: 'Time Off Summary',
    });
    expect(report.mutation).toMatchObject({ operation: 'insert', table: 'time_off_summary_runs' });
    expect(history.error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_SUMMARY_REPORT_UNAVAILABLE' });
    expect(sourceReport).toContain('id="action_report_holidayssummary"');
    expect(sourceReport).toContain('<field name="report_name">hr_holidays.report_holidayssummary</field>');
    expect(sourceReport).toContain('paperformat_hrsummary');
    expect(sourceTemplate).toContain('id="report_holidayssummary"');
    expect(sourceTemplate).toContain('Time Off Summary');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('prepares a deterministic 60-day PDF report run with source metadata', async () => {
    const { database, repository } = await openRepository();
    try {
      const result = await repository.executeMutation(action().mutation, {
        values: { employee_id: 'employee-demo-002', employee_name: 'Marc Demo', date_from: '2026-03-01', holiday_type: 'Approved' },
        current_user_name: 'Time Off Manager',
      }) as any;
      expect(result).toMatchObject({
        id: 'time-off-summary-employee-demo-002-1', employee_id: 'employee-demo-002', employee_name: 'Marc Demo',
        date_from: '2026-03-01T00:00:00.000Z', date_to: '2026-04-29T00:00:00.000Z',
        report_name: 'Time Off Summary', report_action: 'hr_holidays.action_report_holidayssummary',
        report_template: 'hr_holidays.report_holidayssummary', paperformat: 'paperformat_hrsummary',
        output_format: 'PDF', filename: 'time-off-summary-marc-demo-2026-03-01.pdf',
        leave_count: 1, total_days: 5, printed_by: 'Time Off Manager',
      });
      expect(await repository.query('SELECT COUNT(*) AS count FROM time_off_summary_runs')).toEqual([{ count: 1 }]);
      expect((await repository.querySource(yaml('api/report-by-employee.yaml').datasources.find((source: any) => source.id === 'time_off_summary_runs'), { employee_id: 'employee-demo-002' }, 0, 10)).data).toEqual([
        expect.objectContaining({ report_action: 'hr_holidays.action_report_holidayssummary', output_format: 'PDF', filename: 'time-off-summary-marc-demo-2026-03-01.pdf' }),
      ]);
    } finally {
      await database.close();
    }
  });

  test('replays the migration and keeps report history across file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-time-off-summary-report-'));
    const databasePath = join(directory, 'time-off.duckdb');
    const migrationName = `time_off_summary_report_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await openRepository(databasePath, migrationName);
      await first.repository.executeMutation(action().mutation, {
        values: { employee_id: 'employee-demo-002', employee_name: 'Marc Demo', date_from: '2026-03-01', holiday_type: 'Approved' },
        current_user_name: 'Restart Operator',
      });
      await first.database.close();
      const second = await openRepository(databasePath, migrationName);
      await migrateDatabase(second.repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await second.repository.query('SELECT report_action, output_format, printed_by FROM time_off_summary_runs WHERE employee_id = ?', ['employee-demo-002'])).toEqual([
        { report_action: 'hr_holidays.action_report_holidayssummary', output_format: 'PDF', printed_by: 'Restart Operator' },
      ]);
      await second.database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps the read permission and validation guards on the report wizard', () => {
    const report = action();
    expect(report.permission).toBe('time_off.read');
    expect(report.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'TIME_OFF_SUMMARY_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ status: 422, code: 'TIME_OFF_SUMMARY_DATE_INVALID' }),
      expect.objectContaining({ status: 422, code: 'TIME_OFF_SUMMARY_TYPE_INVALID' }),
    ]));
  });
});
