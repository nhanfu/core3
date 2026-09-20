import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/sale_renting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);
const transition = (id: string) => yaml('pages/rental-workflow.yaml').workflow.transitions.find((candidate: any) => candidate.id === id);

async function testRepository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Sale Renting focused Odoo parity', () => {
  test('keeps page/API contracts joined by page id and preserves /rental-events', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const eventsPage = yaml('pages/rental-events.yaml');
    const eventsApi = yaml('api/rental-events.yaml');
    const listPage = yaml('pages/rentals.yaml');
    const listApi = yaml('api/rentals.yaml');
    expect(eventsPage.datasources).toBeUndefined();
    expect(eventsPage.actions).toBeUndefined();
    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(eventsApi.page.id).toBe(eventsPage.page.id);
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(discovered.pageDatasources.get('rental-events')).toContain('rental_events');
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/rental-events', page: 'rental-events', module: 'sale-renting' }));
    expect(listApi.datasources.find((source: any) => source.id === 'sale_rentals').query).toContain('row_version');
  });

  test('persists edit validation, stale writes, cancellation, overlap, and availability behavior', async () => {
    const { database, repository } = await testRepository('sale_renting_focused_lifecycle');
    const create = action('api/rentals.yaml', 'create_rental');
    const edit = action('api/rental-detail.yaml', 'edit_rental_detail');
    const createInput = (overrides: Record<string, unknown> = {}) => ({
      values: {
        name: 'QA rental', partner_name: 'QA Customer', product_name: 'QA Forklift', quantity: 1,
        rental_period: 'Days', state: 'Quotation', start_date: '2026-09-20', return_date: '2026-09-22',
        price: 100, salesperson: 'QA User', ...overrides,
      },
    });
    const first = await repository.executeMutation(create.mutation, createInput());
    expect(first).toMatchObject({ state: 'Quotation', row_version: 1, quantity: 1 });
    await expect(repository.executeMutation(create.mutation, createInput({ quantity: 0 }))).rejects.toMatchObject({ status: 422, code: 'RENTAL_VALUES_INVALID' });
    await expect(repository.executeMutation(create.mutation, createInput({ start_date: '2026-09-24', return_date: '2026-09-22' }))).rejects.toMatchObject({ status: 422, code: 'RENTAL_DATES_INVALID' });
    await expect(repository.executeMutation(create.mutation, createInput({ start_date: 'not-a-date' }))).rejects.toMatchObject({ status: 422, code: 'RENTAL_DATES_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, {
      id: first.id, expected_row_version: 1,
      values: { name: 'QA rental edited', partner_name: 'QA Customer', product_name: 'QA Forklift', quantity: 2, rental_period: 'Weeks', start_date: '2026-09-20', return_date: '2026-09-29', price: 125, salesperson: 'QA User' },
    });
    expect(updated).toMatchObject({ name: 'QA rental edited', quantity: 2, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: first.id, expected_row_version: 1,
      values: { name: 'Stale edit', product_name: 'QA Forklift', quantity: 1, rental_period: 'Days', start_date: '2026-09-20', return_date: '2026-09-22', price: 100 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: first.id, expected_row_version: 2,
      values: { name: 'Bad quantity', product_name: 'QA Forklift', quantity: -1, rental_period: 'Days', start_date: '2026-09-20', return_date: '2026-09-22', price: 100 },
    })).rejects.toMatchObject({ status: 422, code: 'RENTAL_VALUES_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: first.id, expected_row_version: 2,
      values: { name: 'Bad dates', product_name: 'QA Forklift', quantity: 1, rental_period: 'Days', start_date: '2026-09-30', return_date: '2026-09-22', price: 100 },
    })).rejects.toMatchObject({ status: 422, code: 'RENTAL_DATES_INVALID' });

    const reserve = transition('reserve').mutation;
    const cancel = transition('cancel').mutation;
    const second = await repository.executeMutation(create.mutation, createInput({ name: 'QA overlap', start_date: '2026-09-21', return_date: '2026-09-23' }));
    const reserved = await repository.executeMutation(reserve, { id: first.id, expected_row_version: 2, current_user_name: 'QA User' });
    expect(reserved).toMatchObject({ state: 'Reserved', row_version: 3 });
    await expect(repository.executeMutation(reserve, { id: second.id, expected_row_version: 1, current_user_name: 'QA User' })).rejects.toMatchObject({ status: 409, code: 'RENTAL_PERIOD_OVERLAP' });
    expect((await repository.query('SELECT state, row_version FROM sale_rentals WHERE id = ?', [second.id]))[0]).toMatchObject({ state: 'Quotation', row_version: 1 });
    const cancelled = await repository.executeMutation(cancel, { id: second.id, expected_row_version: 1, current_user_name: 'QA User' });
    expect(cancelled).toMatchObject({ state: 'Cancelled', row_version: 2 });
    await expect(repository.executeMutation(cancel, { id: second.id, expected_row_version: 1, current_user_name: 'QA User' })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const noDates = await repository.executeMutation(create.mutation, createInput({ name: 'QA missing dates', start_date: null, return_date: null }));
    await expect(repository.executeMutation(reserve, { id: noDates.id, expected_row_version: 1, current_user_name: 'QA User' })).rejects.toMatchObject({ status: 422, code: 'RENTAL_DATES_REQUIRED' });
    const availability = yaml('api/rental-availability.yaml').datasources[0];
    expect((await repository.querySource(availability, {}, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ product_name: 'QA Forklift', reserved_quantity: 3 }),
    ]));
    expect((await repository.query('SELECT event_type FROM sale_rental_events WHERE rental_id = ? ORDER BY event_date', [second.id])).map((row: any) => row.event_type)).toEqual(['cancellation']);
    database.close();
  });

  test('declares read/write permissions on every rental boundary and transition', () => {
    const permissions = yaml('permissions.yaml').permissions;
    expect(permissions).toEqual(expect.arrayContaining(['rental.read', 'rental.write', 'rental.manage']));
    for (const file of ['api/rentals.yaml', 'api/rental-detail.yaml', 'api/rental-events.yaml', 'api/rental-availability.yaml']) {
      const fragment = yaml(file);
      for (const source of fragment.datasources || []) expect(source.permission, `${file}:${source.id}`).toBe('rental.read');
      for (const candidate of fragment.actions || []) {
        if (candidate.type === 'server' || candidate.type === 'server_form') expect(candidate.permission, `${file}:${candidate.id}`).toBe('rental.write');
      }
    }
    for (const candidate of yaml('pages/rental-workflow.yaml').workflow.transitions) expect(candidate.permission).toBe('rental.write');
  });
});
