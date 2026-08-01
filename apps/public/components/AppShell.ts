import { BaseComponent } from '../../lib/components/BaseComponent.ts';
import { html } from '../../lib/html.ts';
import { i18n } from '../../lib/i18n.ts';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileDrawer } from './ProfileDrawer.ts';
import { appendIcon } from '../../lib/components/Icon.ts';

export type NavItem = { path: string; label: string; icon: string; permission?: string };
type NavGroup = { id: string; label: string; items: NavItem[] };
export type ShellMenu = { dashboard?: NavItem; groups?: NavGroup[] };

function canSeeNavItem(item: NavItem, user: any) {
  return !item.permission || user?.permissions?.includes(item.permission);
}

const THEME_STORAGE_KEY = 'core3_theme';

export class AppShell extends BaseComponent {
  _navEls: Map<string, HTMLElement>;
  _groupEls: Map<string, HTMLElement>;
  _headerTitle: HTMLElement | null;
  _notifPanel: NotificationPanel | null;
  _profileDrawer: ProfileDrawer | null;
  _clockTimer: ReturnType<typeof setInterval> | null;
  _shellToast: HTMLElement | null;
  _shellToastTimer: ReturnType<typeof setTimeout> | null;
  _languageUnsubscribe: (() => void) | null;

  get menu(): ShellMenu {
    return this.state.menu || {};
  }

  go(path: string) {
    if (typeof this.state.navigate === 'function') this.state.navigate(path);
  }

  constructor(id: string, state: any) {
    super(id, { activePath: '/dashboard', title: 'Application', openGroups: {}, menu: {}, showWelcomeToast: false, ...state });
    this._navEls = new Map();  // path → div element
    this._groupEls = new Map();
    this._headerTitle = null;
    this._notifPanel = null;
    this._profileDrawer = null;
    this._clockTimer = null;
    this._shellToast = null;
    this._shellToastTimer = null;
    this._languageUnsubscribe = i18n.onChange(() => {
      this.refreshLanguage();
      const refreshPage = this.state.onLanguageChange;
      if (typeof refreshPage === 'function') void refreshPage();
    });
  }

  refreshLanguage() {
    this._notifPanel?.refreshLanguage();
    this._profileDrawer?.refreshLanguage();
    this._groupEls.forEach((group, groupId) => {
      const groupDef = (this.menu.groups || []).find(candidate => candidate.id === groupId);
      const label = group.querySelector('.sidebar-group-label');
      if (groupDef && label) label.textContent = i18n.t('*', null, groupDef.label);
    });
    this._navEls.forEach((element, path) => {
      const items = [this.menu.dashboard, ...(this.menu.groups || []).flatMap(group => group.items)].filter(Boolean) as NavItem[];
      const item = items.find(candidate => candidate.path === path);
      const label = element.querySelector('.nav-item-label');
      if (item && label) {
        const translated = i18n.t('*', null, item.label);
        label.textContent = translated;
        element.dataset.search = translated.toLocaleLowerCase(i18n.lang);
      }
    });
  }

  setActivePath(path: string) {
    this._navEls.forEach((el: HTMLElement, p: string) => {
      el.classList.toggle('active', p === path);
    });
    const containingGroup = (this.menu.groups || []).find(group => group.items.some(item => item.path === path));
    if (containingGroup) this.setGroupOpen(containingGroup.id, true);
  }

  setGroupOpen(groupId: string, open: boolean) {
    this.state.openGroups[groupId] = open;
    const group = this._groupEls.get(groupId);
    if (group) group.classList.toggle('open', open);
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
    const logoIdentity = html.take(logo).div.className('sidebar-logo-identity').getContext();
    const logoMark = html.take(logoIdentity).span.className('sidebar-logo-mark').getContext();
    logoMark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 17 10-10M7 7h4v4M17 17h-4v-4"/><path d="m5 12 3-3M19 12l-3 3"/></svg>';
    const logoCopy = html.take(logoIdentity).div.getContext();
    html.take(logoCopy).div.className('sidebar-logo-text').text(this.state.brand?.name || this.state.company?.short_name || 'Core3');
    html.take(logoCopy).div.className('sidebar-logo-sub').text(this.state.brand?.subtitle || 'Application');

    const menuSearch = html.take(sidebar).div.className('sidebar-menu-search').getContext();
    const menuSearchIcon = html.take(menuSearch).span.className('sidebar-menu-search-icon').getContext();
    appendIcon(menuSearchIcon, 'search');
    const menuSearchInput = html.take(menuSearch).input
      .type('search')
      .attr('placeholder', i18n.t('*', null, 'Search menu...'))
      .attr('aria-label', i18n.t('*', null, 'Search menu'))
      .getContext();

    // Nav
    const nav = html.take(sidebar).nav.className('sidebar-nav').getContext();
    const createNavItem = (target: HTMLElement, item: NavItem) => {
      const isActive = this.state.activePath === item.path;
      const navItem = html.take(target).button
        .className('nav-item' + (isActive ? ' active' : ''))
        .attr('type', 'button')
        .event('click', () => this.go(item.path))
        .getContext();
      const translated = i18n.t('*', null, item.label);
      navItem.dataset.search = translated.toLocaleLowerCase(i18n.lang);
      const navIcon = html.take(navItem).span.className('nav-item-icon').getContext();
      appendIcon(navIcon, item.icon);
      html.take(navItem).span.className('nav-item-label').text(translated);
      this._navEls.set(item.path, navItem);
    };

    const dashboard = this.menu.dashboard;
    if (dashboard && canSeeNavItem(dashboard, user)) createNavItem(nav, dashboard);
    for (const groupDef of this.menu.groups || []) {
      const visibleItems = groupDef.items.filter(item => canSeeNavItem(item, user));
      if (!visibleItems.length) continue;
      const group = html.take(nav).div
        .className('sidebar-nav-group' + (this.state.openGroups[groupDef.id] ? ' open' : ''))
        .getContext();
      this._groupEls.set(groupDef.id, group);
      const button = html.take(group).button
        .className('sidebar-group-button')
        .attr('type', 'button')
        .attr('aria-expanded', this.state.openGroups[groupDef.id] ? 'true' : 'false')
        .getContext();
      html.take(button).span.className('sidebar-group-label').text(i18n.t('*', null, groupDef.label));
      html.take(button).span.className('sidebar-group-count').text(String(visibleItems.length));
      const chevron = html.take(button).span.className('sidebar-group-chevron').getContext();
      appendIcon(chevron, 'chevron-down');
      button.addEventListener('click', () => {
        const open = !this.state.openGroups[groupDef.id];
        button.setAttribute('aria-expanded', String(open));
        this.setGroupOpen(groupDef.id, open);
      });
      const items = html.take(group).div.className('sidebar-group-items').getContext();
      visibleItems.forEach(item => createNavItem(items, item));
    }

    menuSearchInput.addEventListener('input', () => {
      const query = menuSearchInput.value.trim().toLocaleLowerCase(i18n.lang);
      this._navEls.forEach((item) => {
        item.style.display = !query || item.dataset.search?.includes(query) ? '' : 'none';
      });
      (this.menu.groups || []).forEach(groupDef => {
        const group = this._groupEls.get(groupDef.id);
        if (!group) return;
        const hasMatch = groupDef.items.some(item => canSeeNavItem(item, user)
          && i18n.t('*', null, item.label).toLocaleLowerCase(i18n.lang).includes(query));
        group.style.display = !query || hasMatch ? '' : 'none';
        if (query && hasMatch) this.setGroupOpen(groupDef.id, true);
      });
    });

    // Sidebar footer — user info
    const footer = html.take(sidebar).div.className('sidebar-footer').getContext();
    const userRow = html.take(footer).div.className('sidebar-user').getContext();
    html.take(userRow).div.className('sidebar-avatar').text(initials);
    const userInfo = html.take(userRow).div.getContext();
    html.take(userInfo).div.className('sidebar-user-name').text(user?.name || 'User');
    html.take(userInfo).div.className('sidebar-user-role').text((user?.roles || []).join(', '));
    html.take(footer).div.className('sidebar-footer-version').text(this.state.brand?.footer || '© 2026 Core3');

    // ── MAIN ──
    const main = html.take(layout).div.className('app-main').getContext();

    // Header
    const header = html.take(main).header.className('app-header').getContext();

    const tenantContext = html.take(header).div.className('tenant-context').getContext();
    const sidebarToggle = html.take(tenantContext).button
      .className('header-icon-btn sidebar-toggle')
      .attr('type', 'button')
      .attr('title', 'Thu gọn menu')
      .attr('aria-label', 'Thu gọn menu')
      .getContext();
    const sidebarToggleIcon = html.take(sidebarToggle).span.getContext();
    appendIcon(sidebarToggleIcon, 'panel');
    sidebarToggle.addEventListener('click', () => {
      const collapsed = layout.classList.toggle('sidebar-collapsed');
      sidebarToggle.title = collapsed ? 'Mở rộng menu' : 'Thu gọn menu';
      sidebarToggle.setAttribute('aria-label', sidebarToggle.title);
    });
    html.take(tenantContext).span.className('tenant-context-name').text(
      this.state.company?.short_name || this.state.company?.name || this.state.brand?.name || 'Core3',
    );

    // Header right — actions
    const actions = html.take(header).div.className('header-actions').getContext();

    // Theme toggle mirrors the reference shell and persists the preference per browser.
    const themeButton = html.take(actions).button
      .className('header-icon-btn theme-toggle')
      .attr('type', 'button')
      .getContext();
    const themeIcon = html.take(themeButton).span.getContext();
    const applyTheme = (theme: 'light' | 'dim') => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      themeButton.title = theme === 'dim' ? 'Use light theme' : 'Use dim theme';
      themeButton.setAttribute('aria-label', themeButton.title);
      themeIcon.innerHTML = '';
      appendIcon(themeIcon, theme === 'dim' ? 'sun' : 'moon');
    };
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(storedTheme === 'dim' ? 'dim' : 'light');
    themeButton.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dim' ? 'light' : 'dim');
    });

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

    const attendanceBtn = html.take(actions).button
      .className('header-icon-btn attendance-btn')
      .attr('type', 'button')
      .attr('title', 'Timesheets')
      .attr('aria-label', 'Timesheets')
      .event('click', () => this.go('/hr/timesheets'))
      .getContext();
    const attendanceIcon = html.take(attendanceBtn).span.getContext();
    appendIcon(attendanceIcon, 'clock');
    html.take(attendanceBtn).span.className('header-time').text(
      new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
    );
    const updateClock = () => {
      const clock = attendanceBtn.querySelector('.header-time') as HTMLElement | null;
      if (clock) clock.textContent = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    };
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = setInterval(updateClock, 60_000);

    const chatBtn = html.take(actions).button
      .className('header-icon-btn')
      .attr('type', 'button')
      .attr('title', 'Messages')
      .attr('aria-label', 'Messages')
      .event('click', () => this.go('/chat'))
      .getContext();
    const chatIcon = html.take(chatBtn).span.getContext();
    appendIcon(chatIcon, 'message');

    // Notification bell button — rendered as a container so we can add badge inside
    const bellBtn = html.take(actions).button
      .className('header-icon-btn')
      .attr('title', i18n.t('*', null, 'Notifications'))
      .attr('aria-label', i18n.t('*', null, 'Notifications'))
      .getContext();
    const bellIcon = html.take(bellBtn).span.getContext();
    appendIcon(bellIcon, 'bell', i18n.t('*', null, 'Notifications'));

    // Notification badge (hidden until unread count > 0)
    const badge = html.take(bellBtn).span
      .className('notif-badge')
      .style('display:none')
      .getContext();

    // Keep the theme switch beside notification controls, as in the reference header.
    actions.append(themeButton);

    // User identity and profile button
    const userIdentity = html.take(actions).div.className('header-user-identity').getContext();
    html.take(userIdentity).div.className('header-user-name').text(user?.name || 'User');
    html.take(userIdentity).div.className('header-user-role').text((user?.roles || []).join(', '));
    html.take(actions).button
      .className('avatar-btn')
      .text(initials)
      .attr('title', user?.name || i18n.t('*', null, 'Profile'))
      .attr('aria-label', user?.name || i18n.t('*', null, 'Profile'))
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

    // The welcome toast is only requested for the first shell mount after login.
    if (!this.state.showWelcomeToast) return;

    const toast = html.take(document.body).div
      .className('shell-toast')
      .attr('role', 'status')
      .attr('aria-live', 'polite')
      .getContext();
    const toastIcon = html.take(toast).span.className('shell-toast-icon').getContext();
    appendIcon(toastIcon, 'check');
    html.take(toast).span.className('shell-toast-message').text(`Xin chào, ${user?.name || 'bạn'}`);
    const toastClose = html.take(toast).button
      .className('shell-toast-close')
      .attr('type', 'button')
      .attr('aria-label', 'Close thông báo')
      .getContext();
    appendIcon(toastClose, 'x');
    const dismissToast = () => {
      if (this._shellToastTimer) clearTimeout(this._shellToastTimer);
      this._shellToastTimer = null;
      toast.remove();
      if (this._shellToast === toast) this._shellToast = null;
    };
    toastClose.addEventListener('click', dismissToast);
    this._shellToast = toast;
    this._shellToastTimer = setTimeout(dismissToast, 5000);
  }

  dispose() {
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = null;
    if (this._shellToastTimer) clearTimeout(this._shellToastTimer);
    this._shellToastTimer = null;
    this._notifPanel?.dispose();
    this._profileDrawer?.dispose();
    this._notifPanel = null;
    this._profileDrawer = null;
    this._shellToast?.remove();
    this._shellToast = null;
    this._languageUnsubscribe?.();
    this._languageUnsubscribe = null;
    super.dispose();
  }

}
