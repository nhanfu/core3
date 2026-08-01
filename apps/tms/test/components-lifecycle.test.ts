import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../public/app.ts', () => ({
  getToken: () => null,
  getUser: () => null,
  logout: vi.fn(),
  navigate: vi.fn(),
}));

import { AppShell } from '../../public/components/AppShell.ts';
import { NotificationPanel } from '../../public/components/NotificationPanel.ts';
import { ProfileDrawer } from '../../public/components/ProfileDrawer.ts';
import { i18n } from '../../lib/i18n.ts';
import { LoginForm } from '../../lib/components/LoginForm.ts';

describe('TMS shell lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('test fetch')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('cleans shell timers and body-mounted overlays on dispose', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const shell = new AppShell('shell', {
      user: { name: 'Admin User', roles: ['Administrator'], permissions: ['fleet.read'] },
      company: { short_name: 'MovedX' },
      showWelcomeToast: true,
    });

    shell.mount(host);
    expect(document.querySelector('.notif-panel')).not.toBeNull();
    expect(document.querySelector('.profile-drawer')).not.toBeNull();
    expect(document.querySelector('.shell-toast')).not.toBeNull();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    shell.dispose();


    expect(document.querySelector('.notif-panel')).toBeNull();
    expect(document.querySelector('.profile-drawer')).toBeNull();
    expect(document.querySelector('.shell-toast')).toBeNull();
    expect(intervalSpy).toHaveBeenCalledTimes(2);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
  });

  it('automatically dismisses the welcome toast', () => {
    const host = document.createElement('div');
    const shell = new AppShell('shell-toast-timeout', {
      user: { name: 'Admin User', permissions: ['fleet.read'] },
      showWelcomeToast: true,
    });

    shell.mount(host);
    expect(document.querySelector('.shell-toast')).not.toBeNull();

    vi.advanceTimersByTime(4999);
    expect(document.querySelector('.shell-toast')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.shell-toast')).toBeNull();

    shell.dispose();
  });

  it('does not render the welcome toast for a normal shell mount', () => {
    const host = document.createElement('div');
    const shell = new AppShell('shell-without-toast', {
      user: { name: 'Admin User', permissions: ['fleet.read'] },
    });

    shell.mount(host);
    expect(document.querySelector('.shell-toast')).toBeNull();
    shell.dispose();
  });

  it('keeps shared shell branding and organization labels localized', () => {
    const host = document.createElement('div');
    const shell = new AppShell('localized-labels', {
      user: { name: 'Admin User', permissions: ['settings.read'] },
    });

    shell.mount(host);

    expect(host.querySelector('.sidebar-logo-sub')?.textContent).toBe('Điều xe & Tài xế');
    expect(host.querySelector('.global-search')).toBeNull();
    expect(host.querySelector('.header-title')).toBeNull();
    expect(host.querySelector('.nav-item-label')?.textContent).not.toContain('Team');
    expect(host.textContent).toContain('Đội nhóm');

    shell.dispose();
  });

  it('renders the MovedX login entry point from the active language catalog', async () => {
    const host = document.createElement('div');
    new LoginForm('login-form', {}, {
      logo_title: 'MovedX',
      logo_subtitle: 'Điều xe & Quản lý vận tải',
      title: 'Đăng nhập vào tài khoản của bạn',
      email: { label: 'Email' },
      password: { label: 'Mật khẩu' },
      submit_label: 'Đăng nhập',
      credentials_label: 'Thông tin đăng nhập mẫu:',
    }).mount(host);

    expect(host.querySelector('.login-logo-title')?.textContent).toBe('MovedX');
    expect(host.querySelector('.login-logo-icon svg')).not.toBeNull();
    expect(host.querySelector('.login-title')?.textContent).toBe('Đăng nhập vào tài khoản của bạn');
    expect(host.querySelector('.login-footer')?.textContent).toContain('Thông tin đăng nhập mẫu:');
    expect(host.querySelectorAll('label')[1]?.textContent).toBe('Mật khẩu');

  });

  it('marks an individual unread notification read and updates the badge', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const panel = new NotificationPanel('notifications', {
      notifications: [{ id: 'notif-1', title: 'Service overdue', body: 'Truck needs service', read: false }],
      unread: 1,
    });
    const badgeChange = vi.fn();
    panel._onBadgeChange = badgeChange;
    const host = document.createElement('div');
    panel.mount(host);

    expect(host.querySelector('.notif-item-icon svg')).not.toBeNull();
    (host.querySelector('.notif-item') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith('/api/v1/notifications/notif-1/read', expect.objectContaining({ method: 'PATCH' }));
    expect(panel.state.notifications[0].read).toBe(true);
    expect(panel.state.unread).toBe(0);
    expect(badgeChange).toHaveBeenLastCalledWith(0);
    panel.dispose();
  });

  it('renders shell notification copy from the active language catalog', () => {
    const cache = (i18n as any)._cache as Map<string, Record<string, string>>;
    const previousLanguage = i18n.lang;
    const previousTranslations = cache.get('vi:*');
    i18n.lang = 'vi';
    cache.set('vi:*', {
      Notifications: 'Thông báo',
      'Mark all read': 'Đánh dấu tất cả đã đọc',
      'No notifications': 'Không có thông báo',
    });

    const panel = new NotificationPanel('localized-notifications', { notifications: [] });
    const host = document.createElement('div');
    panel.mount(host);
    expect(host.textContent).toContain('Không có thông báo');
    expect(host.textContent).toContain('Đánh dấu tất cả đã đọc');

    panel.dispose();
    i18n.lang = previousLanguage;
    if (previousTranslations) cache.set('vi:*', previousTranslations);
    else cache.delete('vi:*');
  });

  it('uses semantic notification icons and localized relative time', () => {
    const previousLanguage = i18n.lang;
    i18n.lang = 'vi';
    vi.setSystemTime(new Date('2026-07-26T12:00:00.000Z'));
    const panel = new NotificationPanel('localized-notification-time', {
      notifications: [{
        id: 'notif-info',
        type: 'info',
        title: 'Thông tin',
        created_at: '2026-07-26T11:59:00.000Z',
        read: false,
      }],
      unread: 1,
    });
    const host = document.createElement('div');
    panel.mount(host);

    expect(host.querySelector('.notif-item-icon svg')?.innerHTML).toContain('<circle');
    expect(host.querySelector('.notif-item-time')?.textContent).toBe('1 phút trước');

    panel.dispose();
    i18n.lang = previousLanguage;
  });

  it('closes the profile drawer with Escape', () => {
    const drawer = new ProfileDrawer('profile', { user: { name: 'Admin User' } });
    const host = document.createElement('div');
    document.body.appendChild(host);
    drawer.mount(host);
    drawer.open();
    expect(host.querySelector('.profile-drawer')?.getAttribute('style')).toContain('display: flex');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(host.querySelector('.profile-drawer')?.getAttribute('style')).toContain('display: none');
    drawer.dispose();
  });

  it('refreshes mounted shell overlays when the language catalog changes', () => {
    const cache = (i18n as any)._cache as Map<string, Record<string, string>>;
    const previousLanguage = i18n.lang;
    const previousTranslations = cache.get('vi:*');
    i18n.lang = 'vi';
    cache.set('vi:*', {
      Notifications: 'Thông báo',
      'Mark all read': 'Đánh dấu tất cả đã đọc',
      'No notifications': 'Không có thông báo',
      Profile: 'Hồ sơ',
      Language: 'Ngôn ngữ',
      'Change Password': 'Đổi mật khẩu',
      'Current password': 'Mật khẩu hiện tại',
      'New password': 'Mật khẩu mới',
      'Confirm new password': 'Xác nhận mật khẩu mới',
      'Update password': 'Cập nhật mật khẩu',
    });
    const refreshPage = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shell = new AppShell('localized-shell', {
      user: { name: 'Admin User', permissions: ['fleet.read'] },
      onLanguageChange: refreshPage,
    });
    shell.mount(host);

    for (const listener of (i18n as any)._listeners as Set<(lang: string) => void>) listener('vi');

    expect(document.querySelector('.notif-panel-title')?.textContent).toBe('Thông báo');
    expect(document.querySelector('.drawer-title')?.textContent).toBe('Hồ sơ');
    expect(refreshPage).toHaveBeenCalledTimes(1);
    shell.dispose();
    i18n.lang = previousLanguage;
    if (previousTranslations) cache.set('vi:*', previousTranslations);
    else cache.delete('vi:*');
  });
});
