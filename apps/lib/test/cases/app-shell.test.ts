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
      apps: [{ id: 'order', label: 'Orders', route: '/order', available: true }],
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

    const rootTrigger = container.querySelector<HTMLButtonElement>('.header-nav-trigger')!;
    rootTrigger.dispatchEvent(new MouseEvent('mouseenter'));
    expect(container.querySelector('.header-nav-group.open')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('.theme-toggle')!.click();
    expect(document.documentElement.dataset.theme).toBe('dim');
  });

  it('opens nested menu items on hover and click', () => {
    const container = document.createElement('div');
    const shell = new AppShell('shell', {
      user: { name: 'Admin', roles: [], permissions: [] },
      menu: {
        groups: [{ id: 'operations', label: 'Operations', items: [{
          path: '/dispatch', label: 'Dispatch', icon: 'truck', children: [
            { path: '/orders', label: 'Orders', icon: 'document' },
          ],
        }] }],
      },
      navigate: () => undefined,
    });
    shell.mount(container);

    container.querySelector<HTMLButtonElement>('.header-nav-trigger')!.click();
    expect(container.querySelector('.header-nav-trigger .header-nav-chevron')).toBeNull();
    const submenuTrigger = container.querySelector<HTMLButtonElement>('.header-nav-submenu-trigger')!;
    expect(submenuTrigger.querySelector('.header-nav-chevron')?.innerHTML).toContain('m9 6 6 6-6 6');
    submenuTrigger.dispatchEvent(new MouseEvent('mouseenter'));
    expect(container.querySelector('.header-nav-submenu.open')).not.toBeNull();
    submenuTrigger.click();

    expect(container.querySelector('.header-nav-submenu.open')).toBeNull();
    expect(container.querySelector('.header-nav-submenu-menu .header-nav-menu-item')).not.toBeNull();
    expect(submenuTrigger.getAttribute('aria-expanded')).toBe('false');
  });
});
