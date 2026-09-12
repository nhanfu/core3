import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import WebsiteModule from '../services/website/module';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website public visibility', () => {
  test('serves published pages by path/id and never exposes drafts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'website_public_visibility_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const service = {
      async call(operation: string, request: any = {}) {
        const definition = operations[operation];
        const bound = bindNamedParams(definition.query, request);
        return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
      },
    };
    const module = new WebsiteModule();
    const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(new Request(`http://website.test${path}`, init), new URL(`http://website.test${path}`), service);

    const list = await route('/api/public/website/pages');
    expect(list?.status).toBe(200);
    expect((await list?.json()).pages.map((page: any) => page.id)).toEqual(['website-page-demo-001']);
    expect((await (await route('/api/public/website/page?path=/'))?.json()).page).toMatchObject({ id: 'website-page-demo-001', url: '/' });
    expect((await route('/api/public/website/page?path=/contactus'))?.status).toBe(404);
    expect((await route('/api/public/website/pages/website-page-demo-002'))?.status).toBe(404);
    expect((await route('/api/public/website/pages/website-page-demo-001', { method: 'POST' }))?.status).toBe(405);
    database.close();
  });
});
