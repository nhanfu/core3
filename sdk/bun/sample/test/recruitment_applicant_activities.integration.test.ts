import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Recruitment applicant Next Activities parity', () => {
  it('matches Odoo activity list fields and ordering', () => {
    const page = yaml('pages/applicants.yaml');
    const view = page.components[0].views.find((item: any) => item.id === 'activity');
    expect(view.card.fields.map((field: any) => field.field)).toEqual(['activity_date_deadline', 'activity_summary', 'stage', 'activity_user', 'activity_exception']);
    expect(view.record_date_field).toBe('activity_date_deadline');
    expect(view.activity_types.map((item: any) => item.id)).toEqual(['Email', 'Interview', 'Call']);
    expect(page.datasources).toBeUndefined();
  });

  it('returns deterministic overdue and upcoming activities with search and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_activity_test_schema_migrations', ['schema', 'data']);
    const source = yaml('api/applicants.yaml').datasources.find((item: any) => item.id === 'recruitment_applicant_activities');
    const ready = await repository.querySource(source, { q: null, activity_state: null }, 0, 50);
    expect(ready.data.map((row: any) => row.applicant)).toEqual(['Meldona Thang', 'Emily Brooks', 'Demo Candidate']);
    expect((await repository.querySource(source, { q: null, activity_state: 'overdue' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: 'portfolio', activity_state: null }, 0, 50)).data).toMatchObject([{ activity_type: 'Email', activity_exception: 'overdue' }]);
    expect((await repository.querySource(source, { q: 'does-not-exist', activity_state: null }, 0, 50)).data).toEqual([]);
  });
});
