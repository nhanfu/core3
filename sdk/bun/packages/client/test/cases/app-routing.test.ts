import { describe, expect, it } from 'vitest';
import { resolveRouteWithModule } from '../../../../sample/public/app-routing.ts';

describe('manifest-driven application routing', () => {
  const manifests = [
    { id: 'order', routes: [{ path: '/order/orders' }] },
    {
      id: 'base',
      pages: [{ id: 'contact-detail', route: '/base/contact-detail' }],
      routes: [{ path: '/base/contact-detail' }, { path: '/base/contacts' }, { path: '/base/companies' }, { path: '/base/users' }],
    },
  ];
  const apps = [{ id: 'order', module: 'order', route: '/order/orders' }, { id: 'base', module: 'base', route: '/base/contacts' }];

  it('resolves unprefixed base links to the discovered base module', () => {
    expect(resolveRouteWithModule('/contacts', manifests, apps, 'order')).toBe('/base/contacts');
    expect(resolveRouteWithModule('/companies', manifests, apps, 'order')).toBe('/base/companies');
    expect(resolveRouteWithModule('/contact-detail', manifests, apps, 'order')).toBe('/base/contact-detail');
  });

  it('keeps unknown paths relative to the active module', () => {
    expect(resolveRouteWithModule('/unknown', manifests, apps, 'order')).toBe('/order/unknown');
  });
});
