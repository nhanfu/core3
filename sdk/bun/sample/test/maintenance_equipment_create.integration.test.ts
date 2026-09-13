import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance Equipment create parity', () => {
  test('persists a valid equipment record and rejects invalid values before insert', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_equipment_create_migrations', ['schema', 'data']);
    const action = yaml('api/equipment.yaml').actions.find((candidate: any) => candidate.id === 'create_maintenance_equipment');
    expect(action.mutation).toMatchObject({ operation: 'insert', table: 'maintenance_equipment', required: ['name'] });
    expect(action.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_NAME_REQUIRED', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_NAME_EXISTS', status: 409 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_PREVENTIVE_DATE_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_WARRANTY_DATE_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_INTERVAL_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_EQUIPMENT_COST_INVALID', status: 422 }),
    ]));

    const values = {
      name: 'QA Cooling Unit', serial_number: 'QA-HVAC-001', model: 'CoolPro 2', vendor_reference: 'VEND-001',
      category: 'Computers', location: 'Workshop B', owner: 'QA User', technician: 'Alex Chen', team: 'Metrology',
      preventive_interval_days: 45, next_preventive_date: '2026-03-01', warranty_date: '2027-03-01', cost: 1250.5,
      description: 'Deterministic equipment create fixture.',
    };
    const created = await repository.executeMutation(action.mutation, { id: 'equipment-create-qa-001', values });
    expect(created).toMatchObject({ id: 'equipment-create-qa-001', name: values.name, model: values.model, row_version: 1 });
    const list = yaml('api/equipment.yaml').datasources.find((entry: any) => entry.id === 'maintenance_equipment');
    expect((await repository.querySource(list, { q: values.name, category_id: null, state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: created.id, name: values.name, next_preventive_date: '2026-03-01' }),
    ]);

    const invalid = (id: string, extra: Record<string, unknown>) => repository.executeMutation(action.mutation, { id, values: { ...values, name: id, ...extra } });
    await expect(invalid('equipment-create-qa-blank', { name: ' ' })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_EQUIPMENT_NAME_REQUIRED' });
    await expect(invalid('equipment-create-qa-duplicate', { name: ' qa cooling unit ' })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_EQUIPMENT_NAME_EXISTS' });
    await expect(invalid('equipment-create-qa-date', { next_preventive_date: '2026-02-31' })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_EQUIPMENT_PREVENTIVE_DATE_INVALID' });
    await expect(invalid('equipment-create-qa-interval', { preventive_interval_days: -1 })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_EQUIPMENT_INTERVAL_INVALID' });
    await expect(invalid('equipment-create-qa-cost', { cost: -0.01 })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_EQUIPMENT_COST_INVALID' });
    const [count] = await repository.query('SELECT COUNT(*) AS count FROM maintenance_equipment WHERE id LIKE \'equipment-create-qa-%\'');
    expect(Number(count?.count ?? 0)).toBe(1);
    database.close();
  });
});
