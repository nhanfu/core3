import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Odoo view navigation', () => {
  test('uses visible tabs for every multi-view list', () => {
    const pages = readdirSync(join(root, 'pages')).filter(file => file.endsWith('.yaml'));
    const multiViewPages: string[] = [];
    for (const file of pages) {
      const page = yaml(`pages/${file}`);
      for (const component of page.components || []) {
        if (component.type !== 'ListView' || !Array.isArray(component.views) || component.views.length < 2) continue;
        multiViewPages.push(file);
        expect(component.view_navigation, file).toBe('tabs');
        expect(component.views.every((view: any) => typeof view.label === 'string' && view.label.length > 0), file).toBe(true);
      }
    }
    expect(multiViewPages.sort()).toEqual([
      'accrual-plans.yaml',
      'allocations.yaml',
      'analysis.yaml',
      'my-allocations.yaml',
      'my-time-off.yaml',
      'requests.yaml',
      'time-off-approval.yaml',
      'time-off-dashboard.yaml',
      'time-off-overview.yaml',
      'types.yaml',
    ]);
  });

  test('keeps all Time Off screen data in page-id API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const pages = readdirSync(join(root, 'pages')).filter(file => file.endsWith('.yaml'));
    for (const file of pages) {
      const page = yaml(`pages/${file}`);
      if (!page.page) continue;
      expect(page.datasources, file).toBeUndefined();
      const pageId = String(page.page?.id || '');
      expect(pageId, file).not.toBe('');
      if (readdirSync(join(root, 'api')).some(apiFile => apiFile.replace(/\.ya?ml$/, '') === file.replace(/\.ya?ml$/, ''))) {
        expect(discovered.pageDatasources.has(pageId), file).toBe(true);
      }
    }
  });

  test('declares the analysis pivot fields on its API datasource', () => {
    const analysis = yaml('api/analysis.yaml');
    expect(analysis.datasources.find((source: any) => source.id === 'time_off_analysis_states')?.pivot.fields)
      .toEqual(['category', 'request_count']);
  });

  test('guards new requests against reversed dates', () => {
    const page = yaml('pages/requests.yaml');
    const action = page.actions.find((candidate: any) => candidate.id === 'create_leave_request');
    expect(action.mutation.guards[0].query).toContain('CAST(:date_to AS DATE) >= CAST(:date_from AS DATE)');
    expect(action.mutation.guards[0].message).toContain('valid dates');
  });
});
