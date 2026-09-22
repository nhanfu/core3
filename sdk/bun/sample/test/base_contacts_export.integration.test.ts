import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Base Contacts export parity slice', () => {
  test('binds the API-owned export action to the Contacts page by stable page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/contacts.yaml');
    const api = yaml('api/contacts.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'contacts.export');

    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe('contacts');
    expect(discovered.pages.get('contacts')?.config.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'contacts.export', type: 'client', permission: 'base.contacts.read' }),
    ]));
    expect(list.actions).toContainEqual(expect.objectContaining({
      id: 'contacts.export',
      label: 'Export',
      permission: 'base.contacts.read',
    }));
    expect(action.script).toContain("sourceId: 'contacts'");
    expect(action.script).toContain('top: 100');
    expect(action.script).toContain('text/csv;charset=utf-8');
    expect(action.script).toContain('replaceAll');
  });

  test('exports the complete filtered contact result through the durable datasource', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_export_migrations', ['schema', 'data']);

    const source = yaml('api/contacts.yaml').datasources.find((candidate: any) => candidate.id === 'contacts');
    const all = await repository.querySource(source, {
      q: null,
      active: null,
      company_type: null,
      country_name: null,
      fixture_state: null,
    }, 0, 100);
    expect(all.data).toHaveLength(11);
    expect(all.data[0]).toEqual(expect.objectContaining({
      name: 'Azure Interior',
      company_type: 'company',
      email: 'azure@core3.local',
      parent_company_name: null,
      active: true,
    }));

    const filtered = await repository.querySource(source, {
      q: 'Leonie',
      active: 'active',
      company_type: 'person',
      country_name: 'Germany',
      fixture_state: null,
    }, 0, 100);
    expect(filtered.data).toEqual([expect.objectContaining({
      id: 'contact-berlin',
      name: 'Leonie Weber',
      country_name: 'Germany',
    })]);
    expect(filtered.meta.total).toBe(1);
    database.close();
  });

  test('runs the client action and downloads quoted CSV for the active filters', async () => {
    const action = yaml('api/contacts.yaml').actions.find((candidate: any) => candidate.id === 'contacts.export');
    const run = new Function(`return (${action.script})`)();
    const previousDocument = (globalThis as any).document;
    const previousUrl = (globalThis as any).URL;
    let downloadedBlob: Blob | undefined;
    let clicked = false;
    let anchor: any;
    const requests: Array<{ path: string; options: RequestInit }> = [];

    (globalThis as any).document = {
      createElement(tag: string) {
        expect(tag).toBe('a');
        anchor = {
          click() { clicked = true; },
          remove() {},
        };
        return anchor;
      },
      body: { append() {} },
    };
    (globalThis as any).URL = {
      createObjectURL(blob: Blob) {
        downloadedBlob = blob;
        return 'blob:contacts-export';
      },
      revokeObjectURL() {},
    };

    try {
      await run({
        state: { q: 'Leonie', active: 'active', company_type: 'person' },
        request: async (path: string, options: RequestInit) => {
          requests.push({ path, options });
          return {
            data: [{
              name: 'Leonie Weber',
              company_type: 'person',
              email: 'leonie@example.com',
              phone: '"quoted"',
              city: 'Berlin',
              country_name: 'Germany',
              parent_company_name: null,
              active: true,
            }],
            meta: { total: 1 },
          };
        },
      });
    } finally {
      if (previousDocument === undefined) delete (globalThis as any).document;
      else (globalThis as any).document = previousDocument;
      if (previousUrl === undefined) delete (globalThis as any).URL;
      else (globalThis as any).URL = previousUrl;
    }

    expect(requests).toHaveLength(1);
    expect(requests[0].path).toBe('/query');
    expect(JSON.parse(String(requests[0].options.body))).toMatchObject({
      sourceId: 'contacts',
      params: { q: 'Leonie', active: 'active', company_type: 'person' },
      skip: 0,
      top: 100,
    });
    expect(clicked).toBe(true);
    expect(anchor.download).toMatch(/^contacts-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(await downloadedBlob?.text()).toContain('""quoted""');
  });
});
