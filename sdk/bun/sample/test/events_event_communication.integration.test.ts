import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events event Communication parity', () => {
  test('binds the event Communication tab and API by page id', () => {
    const page = yaml('pages/event-detail.yaml');
    const tabs = page.components.find((component: any) => component.type === 'TabGroup');
    const communication = tabs.tabs.find((tab: any) => tab.id === 'communication');
    const grid = communication.components.find((component: any) => component.type === 'LineItemGrid');
    const api = yaml('api/event-detail.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'event_detail_communications');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(grid).toMatchObject({
      source: 'event_detail_communications',
      parent_source: 'event_detail',
      variant: 'odoo_x2many',
    });
    expect(grid.children.map((child: any) => child.field)).toEqual([
      'template_ref', 'interval_nbr', 'interval_unit', 'interval_type',
      'scheduled_date', 'mail_count_done', 'mail_state_label',
    ]);
    expect(source.permission).toBe('events.read');
    expect(source.query).toContain('FROM event_mail_schedulers');
    expect(discovered.pageDatasources.get('event-detail')).toContain('event_detail_communications');
    expect(discovered.pages.get('event-detail')?.config.components[1].tabs[1].components[0].source)
      .toBe('event_detail_communications');
  });
});
