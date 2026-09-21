import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { bindNamedParams } from '@core3/server/database/sql';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function migratedDatabase(path = ':memory:', migrationName = `website_theme_preview_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

async function operation(repository: YamlRepository, name: string, params: Record<string, unknown>) {
  const definition = yaml('operations.yaml').operations[name];
  const bound = bindNamedParams(definition.query, params);
  return repository.query(bound.statement, bound.values);
}

describe('Website theme preview and asset effects parity', () => {
  test('maps Odoo theme form preview to a separate Core3 page/API contract', () => {
    const page = yaml('pages/theme-preview.yaml');
    const api = yaml('api/theme-preview.yaml');
    const themes = yaml('pages/themes.yaml');
    const themesApi = yaml('api/themes.yaml');
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'website-theme-preview', route: '/website-themes/preview', auth: { require: ['website.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(api.datasources[0]).toMatchObject({ id: 'website_theme_preview', permission: 'website.read', single: true });
    expect(api.actions.map((action: any) => action.id)).toEqual(['open_theme_preview', 'back_to_website_themes']);
    expect(themes.components[0].columns.at(-1).actions[0]).toMatchObject({ id: 'open_website_theme_preview', label: 'Preview' });
    expect(themesApi.actions[0]).toMatchObject({ id: 'open_website_theme_preview', type: 'navigate', permission: 'website.read' });
    expect(odooViews).toContain('id="theme_view_form_preview"');
    expect(odooViews).toContain("widget='iframe'");
    expect(odooViews).toContain('id="theme_install_kanban_action"');
  });

  test('persists theme tokens and applies installed or preview theme effects to public pages', async () => {
    const databasePath = `/tmp/core3-website-theme-preview-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_theme_preview_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await migratedDatabase(databasePath, migrationName);
    const preview = yaml('api/theme-preview.yaml').datasources[0];

    expect((await first.repository.querySource(preview, { id: 'theme_docs', website_id: 'website-demo-001' }, 0, 1)).data).toMatchObject({
      display_name: 'docs',
      website_name: 'Core3 Storefront',
      theme_status: 'Available',
      primary_color: '#0F766E',
      accent_color: '#0D9488',
    });
    expect((await operation(first.repository, 'website.public.page_by_path', { url: '/', website_id: 'website-demo-001', preview_theme_id: null }))[0]).toMatchObject({
      theme_id: 'theme_core',
      theme_name: 'theme_core',
      theme_primary_color: '#714BCA',
    });
    expect((await operation(first.repository, 'website.public.page_by_path', { url: '/', website_id: 'website-demo-001', preview_theme_id: 'theme_docs' }))[0]).toMatchObject({
      theme_id: 'theme_core',
      theme_name: 'theme_docs',
      theme_primary_color: '#0F766E',
      theme_surface_color: '#F0FDFA',
    });

    const choose = yaml('api/themes.yaml').actions.find((action: any) => action.id === 'choose_website_theme');
    await first.repository.executeMutation(choose.mutation, { id: 'website-demo-001', theme_id: 'theme_docs', expected_row_version: 1 });
    first.database.close();

    const second = await migratedDatabase(databasePath, migrationName);
    expect((await second.repository.query('SELECT theme_id, theme_revision, row_version FROM website_websites WHERE id = ?', ['website-demo-001']))).toEqual([
      { theme_id: 'theme_docs', theme_revision: 1, row_version: 2 },
    ]);
    expect((await operation(second.repository, 'website.public.page_by_path', { url: '/', website_id: 'website-demo-001', preview_theme_id: null }))[0]).toMatchObject({
      theme_id: 'theme_docs',
      theme_name: 'theme_docs',
      theme_primary_color: '#0F766E',
    });
    second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('keeps preview access read-only and requires the existing Website read permission', () => {
    const page = yaml('pages/theme-preview.yaml');
    const api = yaml('api/theme-preview.yaml');
    expect(page.page.auth.require).toEqual(['website.read']);
    expect(api.datasources[0].permission).toBe('website.read');
    expect(api.actions.every((action: any) => action.permission === 'website.read')).toBe(true);
    expect(api.actions.find((action: any) => action.id === 'open_theme_preview').script).toContain("target.searchParams.set('theme_id'");
    expect(api.actions.find((action: any) => action.id === 'open_theme_preview').script).toContain("window.open");
  });
});
