import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../../../public/components/AppShell.ts';

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('Odoo application shell', () => {
  it('renders launcher, navigation, theme toggle, and responsive menu controls', () => {
    const container = document.createElement('div');
    const shell = new AppShell('shell', {
      user: { name: 'Admin', roles: ['Administrator'], permissions: [] },
      apps: [{ id: 'tms', label: 'TMS', route: '/dashboard', available: true }],
      menu: {
        dashboard: { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        groups: [{ id: 'operations', label: 'Operations', items: [{ path: '/orders', label: 'Orders', icon: 'document' }] }],
      },
      navigate: () => undefined,
    });
    shell.mount(container);

    expect(container.querySelector('.app-header')).not.toBeNull();
    expect(container.querySelector('[aria-label="Switch application"]')).not.toBeNull();
    expect(container.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();

    container.querySelector<HTMLButtonElement>('.header-nav-trigger')!.click();
    expect(container.querySelector('.header-nav-group.open')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('.theme-toggle')!.click();
    expect(document.documentElement.dataset.theme).toBe('dim');
  });
});
