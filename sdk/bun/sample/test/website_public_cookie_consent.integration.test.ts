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

async function setup() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, `website_public_cookie_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  await repository.run("UPDATE website_websites SET cookies_bar = TRUE, block_third_party_domains = TRUE WHERE id = 'website-demo-001'");
  const operations = yaml('operations.yaml').operations;
  const service = {
    async call(operation: string, request: Record<string, unknown> = {}) {
      const definition = operations[operation];
      if (!definition) throw new Error(`Missing Website operation: ${operation}`);
      const bound = bindNamedParams(definition.query, request);
      return { [definition.result_key]: await repository.query(bound.statement, bound.values) };
    },
  };
  const module = new WebsiteModule();
  const route = (path: string, init: RequestInit = {}) => module.handlePublicRoute(
    new Request(`http://website.test${path}`, init),
    new URL(`http://website.test${path}`),
    service,
  );
  return { database, repository, module, route };
}

function cookieFrom(response: Response): string {
  const header = response.headers.get('set-cookie') || '';
  const value = header.split(';', 1)[0]?.slice('website_cookies_bar='.length) || '';
  return decodeURIComponent(value);
}

describe('WEBSITE-PUBLIC-COOKIE-CONSENT-001', () => {
  test('traces Odoo cookie-bar rendering, preference storage, and public YAML operations', () => {
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_templates.xml', 'utf8');
    const interaction = readFileSync('/home/nhanjs/projects/odoo/addons/website/static/src/interactions/cookies/cookies_bar.js', 'utf8');
    const operations = yaml('operations.yaml').operations;

    expect(template).toContain('id="website_cookies_bar"');
    expect(template).toContain('id="cookies-consent-essential"');
    expect(template).toContain('id="cookies-consent-all"');
    expect(interaction).toContain('website_cookies_bar');
    expect(interaction).toContain('this.cookieValue = `{"required": true, "optional": ${isFullConsent}');
    expect(operations['website.public.cookie_consent']).toMatchObject({
      kind: 'public-datasource', route: '/api/public/website/cookie-consent', method: 'GET', result_key: 'websites',
    });
    expect(operations['website.public.cookie_consent.save']).toMatchObject({
      kind: 'public-action', route: '/api/public/website/cookie-consent', method: 'POST', result_key: 'websites',
    });
  });

  test('returns the deterministic banner contract and gates optional cookies until consent', async () => {
    const { database, route } = await setup();
    const initial = await route('/api/public/website/cookie-consent');
    expect(initial?.status).toBe(200);
    const initialBody = await initial!.json();
    expect(initialBody).toMatchObject({
      website: { id: 'website-demo-001', name: 'Core3 Storefront' },
      cookie_name: 'website_cookies_bar',
      cookies_bar: true,
      block_third_party_domains: true,
      optional_cookies_allowed: false,
      show_banner: true,
      consent: null,
      banner: { policy_url: '/cookie-policy', essential_label: 'Only essentials', all_label: 'I agree' },
    });
    database.close();
  });

  test('persists all and essential choices in the Odoo-compatible browser cookie', async () => {
    const { database, route } = await setup();
    const accepted = await route('/api/public/website/cookie-consent', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice: 'all' }),
    });
    expect(accepted?.status).toBe(200);
    const acceptedBody = await accepted!.json();
    expect(acceptedBody).toMatchObject({ optional_cookies_allowed: true, show_banner: false, consent: { required: true, optional: true } });
    const allCookie = cookieFrom(accepted!);
    expect(JSON.parse(allCookie)).toMatchObject({ required: true, optional: true });

    const replayed = await route('/api/public/website/cookie-consent', { headers: { cookie: `website_cookies_bar=${encodeURIComponent(allCookie)}` } });
    expect(await replayed!.json()).toMatchObject({ optional_cookies_allowed: true, show_banner: false, consent: { optional: true } });

    const denied = await route('/api/public/website/cookie-consent', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice: 'essential' }),
    });
    expect(await denied!.json()).toMatchObject({ optional_cookies_allowed: false, show_banner: false, consent: { required: true, optional: false } });
    expect(JSON.parse(cookieFrom(denied!))).toMatchObject({ required: true, optional: false });
    database.close();
  });

  test('rejects malformed choices, unknown websites, disabled bars, and unsupported methods', async () => {
    const { database, route } = await setup();
    expect((await route('/api/public/website/cookie-consent', { method: 'PUT' }))?.status).toBe(405);
    expect((await route('/api/public/website/cookie-consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice: 'tracking' }) }))?.status).toBe(422);
    expect((await route('/api/public/website/cookie-consent?website_id=missing', { method: 'GET' }))?.status).toBe(404);
    expect((await route('/api/public/website/cookie-consent?website_id=website-demo-002', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice: 'all' }) }))?.status).toBe(409);
    const invalid = await route('/api/public/website/cookie-consent', { headers: { cookie: 'website_cookies_bar=true' } });
    expect(invalid?.status).toBe(200);
    expect(invalid?.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await invalid!.json()).toMatchObject({ optional_cookies_allowed: false, show_banner: true, consent: null });
    database.close();
  });
});
