import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../../../../sample/public/components/AppShell.ts';
import { i18n } from '@core3/client/i18n';

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  i18n.lang = 'en';
  i18n._cache.clear();
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

  it('refreshes the main item and groups when the active app menu changes', () => {
    const container = document.createElement('div');
    const shell = new AppShell('shell-menu-refresh', {
      user: { name: 'Admin', roles: [], permissions: [] },
      menu: { dashboard: { path: '/orders', label: 'Orders', icon: 'cart' } },
      navigate: () => undefined,
    });
    shell.mount(container);

    shell.setMenu({
      dashboard: { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' },
      groups: [{ id: 'operations', label: 'Operations', items: [{ path: '/invoices', label: 'Invoices', icon: 'invoice' }] }],
    });

    expect(container.querySelector('.header-nav-link')?.textContent).toContain('Subscriptions');
    expect(container.querySelector('.header-nav-trigger')?.textContent).toContain('Operations');
    expect(container.querySelector('.header-nav-menu .header-nav-link')?.textContent).toContain('Invoices');
    shell.dispose();
  });

  it('localizes shell tooltips after the language changes', () => {
    i18n.hydrate('*', {
      lang: 'vi',
      global: {
        'shell.switch_application': 'Chuyển ứng dụng',
        'shell.messages': 'Tin nhắn',
        'shell.notifications': 'Thông báo',
        'theme.use_dark': 'Dùng giao diện tối',
      },
    });
    const container = document.createElement('div');
    const shell = new AppShell('shell-i18n', {
      user: { name: 'Admin', roles: [], permissions: [] },
      apps: [{ id: 'order', label: 'Orders', route: '/order', available: true }],
      navigate: () => undefined,
    });
    shell.mount(container);
    shell.refreshLanguage();

    expect(container.querySelector('.app-switcher-button')?.getAttribute('aria-label')).toBe('Chuyển ứng dụng');
    expect(container.querySelector('.header-chat-button')?.getAttribute('aria-label')).toBe('Tin nhắn');
    expect(container.querySelector('.header-notifications-button')?.getAttribute('aria-label')).toBe('Thông báo');
    expect(container.querySelector('.theme-toggle')?.getAttribute('aria-label')).toBe('Dùng giao diện tối');
    shell.dispose();
  });
});
