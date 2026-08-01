import { BaseComponent } from '../../lib/components/BaseComponent.ts';
import { html } from '../../lib/html.ts';
import { navigate, logout, getUser } from '../app.ts';
import { i18n } from '../../lib/i18n.ts';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileDrawer } from './ProfileDrawer.ts';
import { appendIcon } from '../../lib/components/Icon.ts';

type NavItem = { path: string; label: string; icon: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const DASHBOARD: NavItem = { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' };

const NAV_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'fleet.read',
  '/orders': 'orders.read', '/chat': 'chat.read', '/schedule': 'dispatch.read',
  '/customers': 'crm.read', '/partners': 'crm.read', '/quotes': 'crm.read',
  '/crm/dashboard': 'crm.read', '/crm/kpi': 'crm.read',
  '/accounting/debit-notes': 'accounting.read', '/accounting/debit-note-summary': 'accounting.read',
  '/accounting/payment-requests': 'accounting.read', '/accounting/payment-request-summary': 'accounting.read',
  '/accounting/advances': 'accounting.read', '/accounting/settlements': 'accounting.read',
  '/accounting/invoice-templates': 'accounting.read', '/accounting/ledger-accounts': 'accounting.read',
  '/hr/employees': 'hr.read', '/hr/contracts': 'hr.read', '/hr/timesheets': 'hr.read',
  '/hr/shifts': 'hr.read', '/hr/payroll': 'hr.read',
  '/drivers': 'drivers.read', '/vehicles': 'fleet.read', '/containers': 'dispatch.read',
  '/locations': 'dispatch.read', '/areas': 'dispatch.read',
  '/catalog/container-types': 'catalog.read', '/catalog/vehicle-types': 'catalog.read',
  '/catalog/units': 'catalog.read', '/catalog/cargo-types': 'catalog.read',
  '/catalog/fee-types': 'catalog.read', '/catalog/currencies': 'catalog.read',
  '/org/own-company': 'settings.read', '/org/branches': 'settings.read',
  '/org/departments': 'settings.read', '/org/teams': 'settings.read',
  '/org/users': 'settings.read', '/org/roles': 'settings.read',
  '/system/activity': 'system.read', '/system/code-rules': 'system.read',
  '/system/print-templates': 'system.read', '/system/approval-flows': 'system.read',
  '/system/shipment-types': 'system.read', '/system/trip-statuses': 'system.read',
  '/system/fee-rules': 'system.read', '/system/storage': 'system.read',
};

function canSeeNavItem(item: NavItem, user: any) {
  const permission = NAV_PERMISSIONS[item.path];
  return !permission || user?.permissions?.includes(permission);
}

const NAV_GROUPS: NavGroup[] = [
  { id: 'operations', label: 'OPERATIONS', items: [
    { path: '/orders', label: 'Orders', icon: 'document' },
    { path: '/chat', label: 'Messages', icon: 'message' },
    { path: '/schedule', label: 'Dispatch schedule', icon: 'calendar' },
  ] },
  { id: 'sales', label: 'SALES', items: [
    { path: '/customers', label: 'Customers', icon: 'users' },
    { path: '/partners', label: 'Partners', icon: 'users' },
    { path: '/quotes', label: 'Quotes', icon: 'warning' },
    { path: '/crm/dashboard', label: 'CRM overview', icon: 'report' },
    { path: '/crm/kpi', label: 'KPI targets', icon: 'analytics' },
  ] },
  { id: 'accounting', label: 'ACCOUNTING', items: [
    { path: '/accounting/debit-notes', label: 'Debit notes', icon: 'file' },
    { path: '/accounting/debit-note-summary', label: 'Debit note summary', icon: 'report' },
    { path: '/accounting/payment-requests', label: 'Payment requests', icon: 'file' },
    { path: '/accounting/payment-request-summary', label: 'Payment request summary', icon: 'report' },
    { path: '/accounting/advances', label: 'Advances', icon: 'money' },
    { path: '/accounting/settlements', label: 'Settlements', icon: 'money' },
    { path: '/accounting/invoice-templates', label: 'Invoice templates', icon: 'document' },
    { path: '/accounting/ledger-accounts', label: 'Chart of accounts', icon: 'table' },
  ] },
  { id: 'hr', label: 'HUMAN RESOURCES', items: [
    { path: '/hr/employees', label: 'Employees', icon: 'users' },
    { path: '/hr/contracts', label: 'Contracts', icon: 'document' },
    { path: '/hr/timesheets', label: 'Timesheets', icon: 'dashboard' },
    { path: '/hr/shifts', label: 'Shifts', icon: 'calendar' },
    { path: '/hr/payroll', label: 'Payroll', icon: 'file' },
  ] },
  { id: 'catalog', label: 'CATALOG', items: [
    { path: '/drivers', label: 'Drivers', icon: 'users' },
    { path: '/vehicles', label: 'Vehicles', icon: 'grid' },
    { path: '/containers', label: 'Containers', icon: 'document' },
    { path: '/locations', label: 'Locations', icon: 'pin' },
    { path: '/areas', label: 'Areas', icon: 'quote' },
    { path: '/catalog/container-types', label: 'Containers types', icon: 'document' },
    { path: '/catalog/vehicle-types', label: 'Vehicle types', icon: 'grid' },
    { path: '/catalog/units', label: 'Units', icon: 'menu' },
    { path: '/catalog/cargo-types', label: 'Cargo types', icon: 'quote' },
    { path: '/catalog/fee-types', label: 'Fee types', icon: 'analytics' },
    { path: '/catalog/currencies', label: 'Currencies', icon: 'money' },
  ] },
  { id: 'organization', label: 'ORGANIZATION & ACCESS', items: [
    { path: '/org/own-company', label: 'Company', icon: 'dashboard' },
    { path: '/org/branches', label: 'Branches', icon: 'home' },
    { path: '/org/departments', label: 'Departments', icon: 'report' },
    { path: '/org/teams', label: 'Teams', icon: 'users' },
    { path: '/org/users', label: 'Users', icon: 'users' },
    { path: '/org/roles', label: 'Roles', icon: 'quote' },
  ] },
  { id: 'system', label: 'SYSTEM', items: [
    { path: '/system/activity', label: 'Activity log', icon: 'activity' },
    { path: '/system/code-rules', label: 'Code rules', icon: 'number' },
    { path: '/system/print-templates', label: 'Print templates', icon: 'file' },
    { path: '/system/approval-flows', label: 'Approval workflows', icon: 'quote' },
    { path: '/system/shipment-types', label: 'Shipment types', icon: 'grid' },
    { path: '/system/trip-statuses', label: 'Trip statuses', icon: 'status' },
    { path: '/system/fee-rules', label: 'Trip fee rules', icon: 'analytics' },
    { path: '/system/storage', label: 'Storage', icon: 'table' },
  ] },
];

const GLOBAL_SEARCH_ITEMS = [
  DASHBOARD,
  ...NAV_GROUPS.flatMap(group => group.items),
];

const THEME_STORAGE_KEY = 'tms_theme';

export class AppShell extends BaseComponent {
  _navEls: Map<string, HTMLElement>;
  _groupEls: Map<string, HTMLElement>;
  _headerTitle: HTMLElement | null;
  _notifPanel: NotificationPanel | null;
  _profileDrawer: ProfileDrawer | null;
  _clockTimer: ReturnType<typeof setInterval> | null;
  _shellToast: HTMLElement | null;
  _languageUnsubscribe: (() => void) | null;

  constructor(id: string, state: any) {
    super(id, { activePath: '/dashboard', title: 'TMS', openGroups: {}, ...state });
    this._navEls = new Map();  // path → div element
    this._groupEls = new Map();
    this._headerTitle = null;
    this._notifPanel = null;
    this._profileDrawer = null;
    this._clockTimer = null;
    this._shellToast = null;
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
      const groupDef = NAV_GROUPS.find(candidate => candidate.id === groupId);
      const label = group.querySelector('.sidebar-group-label');
      if (groupDef && label) label.textContent = i18n.t('*', null, groupDef.label);
    });
    this._navEls.forEach((element, path) => {
      const item = GLOBAL_SEARCH_ITEMS.find(candidate => candidate.path === path);
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
    const containingGroup = NAV_GROUPS.find(group => group.items.some(item => item.path === path));
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
    html.take(logoCopy).div.className('sidebar-logo-text').text('MovedX');
    html.take(logoCopy).div.className('sidebar-logo-sub').text('Điều xe & Drivers');

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
        .event('click', () => navigate(item.path))
        .getContext();
      const translated = i18n.t('*', null, item.label);
      navItem.dataset.search = translated.toLocaleLowerCase(i18n.lang);
      const navIcon = html.take(navItem).span.className('nav-item-icon').getContext();
      appendIcon(navIcon, item.icon);
      html.take(navItem).span.className('nav-item-label').text(translated);
      this._navEls.set(item.path, navItem);
    };

    if (canSeeNavItem(DASHBOARD, user)) createNavItem(nav, DASHBOARD);
    for (const groupDef of NAV_GROUPS) {
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
      NAV_GROUPS.forEach(groupDef => {
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
    html.take(footer).div.className('sidebar-footer-version').text('© 2026 MovedX · v0.1');

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
      this.state.company?.short_name || this.state.company?.name || 'TMS',
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
      .event('click', () => navigate('/hr/timesheets'))
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
      .event('click', () => navigate('/chat'))
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

    // The reference tenant shows a dismissible welcome toast after login.
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
    toastClose.addEventListener('click', () => toast.remove());
    this._shellToast = toast;
  }

  dispose() {
    if (this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = null;
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
