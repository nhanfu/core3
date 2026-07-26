import { BaseComponent } from '@core3/framework/runtime.ts';
import { html } from '@core3/framework/html.ts';
import { navigate, logout, getUser } from '../app.ts';
import { i18n } from '../i18n.ts';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileDrawer } from './ProfileDrawer.ts';

const NAV = [
  { path: '/dashboard',   label: 'Dashboard',   icon: '▦' },
  { path: '/fleet',       label: 'Fleet',       icon: '🚛' },
  { path: '/drivers',     label: 'Drivers',     icon: '👤' },
  { path: '/trips',       label: 'Trips',       icon: '🗺️'  },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/reports',     label: 'Reports',     icon: '📊' },
  { path: '/settings',    label: 'Settings',    icon: '⚙️'  },
];

export class AppShell extends BaseComponent {
  _navEls: Map<string, HTMLElement>;
  _headerTitle: HTMLElement | null;
  _notifPanel: NotificationPanel | null;
  _profileDrawer: ProfileDrawer | null;

  constructor(id: string, state: any) {
    super(id, { activePath: '/fleet', title: 'TMS', ...state });
    this._navEls = new Map();  // path → div element
    this._headerTitle = null;
    this._notifPanel = null;
    this._profileDrawer = null;
  }

  setActivePath(path: string) {
    this._navEls.forEach((el: HTMLElement, p: string) => {
      el.classList.toggle('active', p === path);
    });
  }

  setTitle(title: string) {
    if (this._headerTitle) this._headerTitle.textContent = title;
  }

  draw(container: HTMLElement) {
    const user: any = this.state.user;
    const initials = (user?.name || 'U')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Root layout
    const layout = html.take(container).div.className('app-layout').getContext();

    // ── SIDEBAR ──
    const sidebar = html.take(layout).div.className('app-sidebar').getContext();

    // Logo
    const logo = html.take(sidebar).div.className('sidebar-logo').getContext();
    html.take(logo).div.className('sidebar-logo-text').text('🚛 TMS');
    html.take(logo).div.className('sidebar-logo-sub').text('Transport Management');

    // Nav
    const nav = html.take(sidebar).nav.className('sidebar-nav').getContext();
    html.take(nav).div.className('sidebar-section-title').text('Navigation');

    for (const item of NAV) {
      // Permission-gate certain nav items
      if (item.path === '/settings' && !user?.permissions?.includes('settings.read')) continue;
      if (item.path === '/reports'  && !user?.permissions?.includes('reports.read'))  continue;

      const isActive = this.state.activePath === item.path;
      const navItem = html.take(nav).div
        .className('nav-item' + (isActive ? ' active' : ''))
        .event('click', () => navigate(item.path))
        .getContext();

      html.take(navItem).span.className('nav-item-icon').text(item.icon);
      html.take(navItem).span.className('nav-item-label').text(i18n.t('*', null, item.label));

      this._navEls.set(item.path, navItem);
    }

    // Sidebar footer — user info
    const footer = html.take(sidebar).div.className('sidebar-footer').getContext();
    const userRow = html.take(footer).div.className('sidebar-user').getContext();
    html.take(userRow).div.className('sidebar-avatar').text(initials);
    const userInfo = html.take(userRow).div.getContext();
    html.take(userInfo).div.className('sidebar-user-name').text(user?.name || 'User');
    html.take(userInfo).div.className('sidebar-user-role').text((user?.roles || []).join(', '));

    // ── MAIN ──
    const main = html.take(layout).div.className('app-main').getContext();

    // Header
    const header = html.take(main).header.className('app-header').getContext();

    // Header left — page title
    this._headerTitle = html.take(header).div.className('header-title').text('TMS').getContext();

    // Header right — actions
    const actions = html.take(header).div.className('header-actions').getContext();

    // Language toggle
    const langToggle = html.take(actions).div.className('lang-toggle').getContext();
    const langEN = html.take(langToggle).button
      .className('lang-btn' + (i18n.lang === 'en' ? ' active' : ''))
      .text('EN')
      .event('click', async () => {
        await i18n.setLang('en');
        langEN.classList.add('active');
        langVI.classList.remove('active');
        try {
          await fetch('/api/v1/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tms_token')}` },
            body: JSON.stringify({ preferred_lang: 'en' })
          });
        } catch {}
      })
      .getContext();

    const langVI = html.take(langToggle).button
      .className('lang-btn' + (i18n.lang === 'vi' ? ' active' : ''))
      .text('VI')
      .event('click', async () => {
        await i18n.setLang('vi');
        langVI.classList.add('active');
        langEN.classList.remove('active');
        try {
          await fetch('/api/v1/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tms_token')}` },
            body: JSON.stringify({ preferred_lang: 'vi' })
          });
        } catch {}
      })
      .getContext();

    // Notification bell button — rendered as a container so we can add badge inside
    const bellBtn = html.take(actions).button
      .className('header-icon-btn')
      .attr('title', 'Notifications')
      .getContext();
    html.take(bellBtn).span.text('🔔');

    // Notification badge (hidden until unread count > 0)
    const badge = html.take(bellBtn).span
      .className('notif-badge')
      .style('display:none')
      .getContext();

    // Avatar / profile button
    html.take(actions).button
      .className('avatar-btn')
      .text(initials)
      .attr('title', user?.name || 'Profile')
      .event('click', () => this._profileDrawer?.open());

    // Content outlet
    html.take(main).div.id('outlet').className('app-content');

    // Mount NotificationPanel (renders as a positioned dropdown on document.body)
    this._notifPanel = new NotificationPanel('notif-panel', { unread: 0, open: false });
    this._notifPanel._onBadgeChange = (n: number) => {
      badge.textContent = n > 0 ? (n > 9 ? '9+' : String(n)) : '';
      badge.style.display = n > 0 ? 'flex' : 'none';
    };

    // Toggle panel on bell click
    bellBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this._notifPanel?.toggle();
    });

    this._notifPanel.mount(document.body);

    // Mount ProfileDrawer
    this._profileDrawer = new ProfileDrawer('profile-drawer', { user, open: false });
    this._profileDrawer.mount(document.body);
  }
}
