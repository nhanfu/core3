import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events responsive HTML ticket parity', () => {
  test('joins the source report page/API and attendee action through page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/attendee-responsive-html-ticket.yaml');
    const api = yaml('api/attendee-responsive-html-ticket.yaml');
    const detail = yaml('pages/attendee-detail.yaml');
    const detailApi = yaml('api/attendee-detail.yaml');

    expect(page.page).toMatchObject({ id: 'event-attendee-responsive-html-ticket', route: '/events/attendees/responsive-html-ticket' });
    expect(api.page).toEqual({ id: 'event-attendee-responsive-html-ticket' });
    expect(page.components[1]).toMatchObject({
      type: 'TemplatePreview',
      source: 'event_attendee_responsive_html_ticket_blocks',
      template_source: 'event_registration_report_template_responsive_html_ticket',
    });
    expect(discovered.pageDatasources.get('event-attendee-responsive-html-ticket')).toEqual([
      'event_attendee_responsive_html_ticket',
      'event_attendee_responsive_html_ticket_blocks',
    ]);
    expect(detail.components[0].header_actions).toContainEqual({
      id: 'print_attendee_responsive_html_ticket',
      label: 'Responsive Html Full Page Ticket',
      variant: 'secondary',
      permission: 'events.read',
    });
    expect(detailApi.actions.find((action: any) => action.id === 'print_attendee_responsive_html_ticket')).toMatchObject({
      type: 'navigate',
      permission: 'events.read',
      navigate_to: '/events/attendees/responsive-html-ticket',
    });
  });

  test('projects the responsive source variant and preserves report boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'events_attendee_responsive_html_ticket_test_migrations', ['schema', 'data']);
    const api = yaml('api/attendee-responsive-html-ticket.yaml');
    const ticket = await repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: null }, 0, 1);
    const blocks = await repository.querySource(api.datasources[1], { id: 'registration-demo-004', fixture_state: null }, 0, 20);

    expect(ticket.data).toMatchObject({
      event_name: 'Live Music Festival',
      attendee_name: 'Douglas Fletcher',
      barcode: 'BADGE-MUSIC-004',
      format: 'Responsive HTML',
      download_label: 'Download Tickets',
      responsive_html: true,
      status: 'Ready',
    });
    expect(blocks.data).toHaveLength(8);
    expect(blocks.data.some((block: any) => block.label === 'Ticket Instructions')).toBe(false);
    expect(blocks.data[5]).toMatchObject({ label: 'QR Code', token_key: 'qr', content: 'BADGE-MUSIC-004' });
    expect(blocks.data[6]).toMatchObject({ label: 'Barcode', token_key: 'code128', content: 'BADGE-MUSIC-004' });

    expect((await repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(api.datasources[0], { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(api.datasources[0], { id: 'registration-demo-004', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EVENT_ATTENDEE_RESPONSIVE_HTML_TICKET_UNAVAILABLE' });
    database.close();
  });

  test('keeps the responsive report read-only and deterministic', () => {
    const api = yaml('api/attendee-responsive-html-ticket.yaml');
    expect(api.actions).toBeUndefined();
    expect(readFileSync(join(serviceRoot, 'api/attendee-responsive-html-ticket.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
  });
});
