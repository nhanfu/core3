import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRoot = join(import.meta.dir, '..');
const posRoot = join(sampleRoot, 'services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(posRoot, file), 'utf8')) as any;

describe('POS visual and row navigation regression', () => {
  test('keeps launcher glyph bounds explicit through the shared icon wrapper', () => {
    const shell = readFileSync(join(sampleRoot, 'public/styles/shell.scss'), 'utf8');

    expect(shell).toContain('.app-switcher-icon > .svg-icon');
    expect(shell).toContain('.app-switcher-item-icon > .svg-icon svg');
    expect(shell).toContain('max-width: 17px; max-height: 17px');
    expect(shell).toContain('.launcher-search-icon > .svg-icon');
  });

  test('opens a POS order detail from either list row interaction with its row id', () => {
    const page = yaml('pages/pos-orders.yaml');
    const api = yaml('api/pos-orders.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const action = api.actions.find((candidate: any) => candidate.id === 'view_pos_order');

    expect(list).toMatchObject({ row_open_action: 'view_pos_order', row_double_click_action: 'view_pos_order' });
    expect(action).toMatchObject({ navigate_to: '/point-of-sale/order-detail', params: { id: '{row.id}' } });
    expect(yaml('pages/pos-order-detail.yaml').page.route).toBe('/point-of-sale/order-detail');
  });
});
