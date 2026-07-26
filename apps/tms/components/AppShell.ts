import { BaseComponent } from '@core3/framework/runtime.ts';
import { html } from '@core3/framework/html.ts';
import { navigate, logout, getUser } from '../app.ts';
import { i18n } from '../i18n.ts';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileDrawer } from './ProfileDrawer.ts';

type NavItem = { path: string; label: string; icon: string };
type NavGroup = { id: string; label: string; count: number; items: NavItem[] };

const ICON_PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  '▦': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  '□': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  '◇': '<path d="m12 3 8 9-8 9-8-9 8-9Z"/><path d="M12 7v10M8 12h8"/>',
  '◫': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h3M13 13h3M8 17h3"/>',
  '○': '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/>',
  '△': '<path d="m12 3 9 18H3L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  '▤': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5M8 18h3"/>',
  '◈': '<path d="m12 2 9 10-9 10-9-10 9-10Z"/><circle cx="12" cy="12" r="2"/>',
  '▧': '<path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v5h5M8 12h8M8 16h6"/>',
  '▥': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h8M8 19h8"/>',
  '⌖': '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="2"/><path d="M12 16v5"/>',
  '▣': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v14M16 5v14"/>',
  '≡': '<path d="M5 6h14M5 12h14M5 18h14"/>',
  '₫': '<path d="M7 4h6a5 5 0 0 1 0 10H7V4Zm0 0v16M4 8h12M4 18h12"/>',
  '⌂': '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/>',
  '◷': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  '#': '<path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"/>',
  '◉': '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
};

function appendIcon(target: HTMLElement, name: string, label?: string) {
  const icon = document.createElement('span');
  icon.className = 'svg-icon';
  icon.setAttribute('aria-hidden', label ? 'false' : 'true');
  if (label) icon.setAttribute('aria-label', label);
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || '<circle cx="12" cy="12" r="8"/>'}</svg>`;
  target.append(icon);
}

const DASHBOARD: NavItem = { path: '/dashboard', label: 'Tổng quan', icon: '▦' };

const NAV_GROUPS: NavGroup[] = [
  { id: 'operations', label: 'ĐIỀU HÀNH', count: 6, items: [
    { path: '/orders', label: 'Đơn hàng', icon: '□' },
    { path: '/chat', label: 'Tin nhắn', icon: '◇' },
    { path: '/schedule', label: 'Lịch điều', icon: '◫' },
  ] },
  { id: 'sales', label: 'KINH DOANH', count: 6, items: [
    { path: '/customers', label: 'Khách hàng', icon: '○' },
    { path: '/partners', label: 'Đối tượng', icon: '◌' },
    { path: '/quotes', label: 'Báo giá', icon: '△' },
    { path: '/crm/dashboard', label: 'Tổng hợp CRM', icon: '▤' },
    { path: '/crm/kpi', label: 'Chỉ tiêu KPI', icon: '◈' },
  ] },
  { id: 'accounting', label: 'KẾ TOÁN', count: 11, items: [
    { path: '/accounting/debit-notes', label: 'Giấy báo nợ', icon: '▧' },
    { path: '/accounting/debit-note-summary', label: 'Tổng hợp giấy báo nợ', icon: '▤' },
    { path: '/accounting/payment-requests', label: 'Đề nghị thanh toán', icon: '▧' },
    { path: '/accounting/payment-request-summary', label: 'Tổng hợp đề nghị chi', icon: '▤' },
    { path: '/accounting/advances', label: 'Tạm ứng', icon: '◇' },
    { path: '/accounting/settlements', label: 'Hoàn ứng', icon: '◇' },
    { path: '/accounting/invoice-templates', label: 'Mẫu hóa đơn', icon: '□' },
    { path: '/accounting/ledger-accounts', label: 'Hệ thống tài khoản', icon: '▥' },
  ] },
  { id: 'hr', label: 'NHÂN SỰ', count: 6, items: [
    { path: '/hr/employees', label: 'Nhân viên', icon: '○' },
    { path: '/hr/contracts', label: 'Hợp đồng', icon: '□' },
    { path: '/hr/timesheets', label: 'Chấm công', icon: '▦' },
    { path: '/hr/shifts', label: 'Ca làm việc', icon: '◫' },
    { path: '/hr/payroll', label: 'Bảng lương', icon: '▧' },
  ] },
  { id: 'catalog', label: 'DANH MỤC', count: 11, items: [
    { path: '/drivers', label: 'Tài xế', icon: '○' },
    { path: '/vehicles', label: 'Phương tiện', icon: '▣' },
    { path: '/containers', label: 'Container', icon: '□' },
    { path: '/locations', label: 'Địa điểm', icon: '⌖' },
    { path: '/areas', label: 'Khu vực', icon: '◇' },
    { path: '/catalog/container-types', label: 'Loại container', icon: '□' },
    { path: '/catalog/vehicle-types', label: 'Loại xe', icon: '▣' },
    { path: '/catalog/units', label: 'Đơn vị tính', icon: '≡' },
    { path: '/catalog/cargo-types', label: 'Loại hàng hóa', icon: '◇' },
    { path: '/catalog/fee-types', label: 'Loại phí', icon: '◈' },
    { path: '/catalog/currencies', label: 'Tiền tệ', icon: '₫' },
  ] },
  { id: 'organization', label: 'TỔ CHỨC & PHÂN QUYỀN', count: 6, items: [
    { path: '/org/own-company', label: 'Công ty chủ quản', icon: '▦' },
    { path: '/org/branches', label: 'Chi nhánh', icon: '⌂' },
    { path: '/org/departments', label: 'Phòng ban', icon: '▤' },
    { path: '/org/teams', label: 'Team', icon: '○' },
    { path: '/org/users', label: 'Người dùng', icon: '○' },
    { path: '/org/roles', label: 'Vai trò', icon: '◇' },
  ] },
  { id: 'system', label: 'HỆ THỐNG', count: 8, items: [
    { path: '/system/activity', label: 'Lịch sử thao tác', icon: '◷' },
    { path: '/system/code-rules', label: 'Cấu hình sinh mã', icon: '#' },
    { path: '/system/print-templates', label: 'Mẫu in', icon: '▧' },
    { path: '/system/approval-flows', label: 'Quy trình duyệt', icon: '◇' },
    { path: '/system/shipment-types', label: 'Loại hình vận chuyển', icon: '▣' },
    { path: '/system/trip-statuses', label: 'Trạng thái chuyến', icon: '◉' },
    { path: '/system/fee-rules', label: 'Công thức phí chuyến', icon: '◈' },
    { path: '/system/storage', label: 'Quản lý dung lượng', icon: '▥' },
  ] },
];

const GLOBAL_SEARCH_ITEMS = [
  DASHBOARD,
  ...NAV_GROUPS.flatMap(group => group.items),
];

export class AppShell extends BaseComponent {
  _navEls: Map<string, HTMLElement>;
  _groupEls: Map<string, HTMLElement>;
  _headerTitle: HTMLElement | null;
  _notifPanel: NotificationPanel | null;
  _profileDrawer: ProfileDrawer | null;

  constructor(id: string, state: any) {
    super(id, { activePath: '/dashboard', title: 'TMS', openGroups: {}, ...state });
    this._navEls = new Map();  // path → div element
    this._groupEls = new Map();
    this._headerTitle = null;
    this._notifPanel = null;
    this._profileDrawer = null;
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
    html.take(logo).div.className('sidebar-logo-text').text('MovedX');
    html.take(logo).div.className('sidebar-logo-sub').text('Điều xe & Quản lý vận tải');

    const menuSearch = html.take(sidebar).div.className('sidebar-menu-search').getContext();
    const menuSearchIcon = html.take(menuSearch).span.className('sidebar-menu-search-icon').getContext();
    appendIcon(menuSearchIcon, 'search');
    const menuSearchInput = html.take(menuSearch).input
      .type('search')
      .attr('placeholder', 'Tìm menu...')
      .attr('aria-label', 'Tìm menu')
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
      navItem.dataset.search = item.label.toLocaleLowerCase('vi');
      const navIcon = html.take(navItem).span.className('nav-item-icon').getContext();
      appendIcon(navIcon, item.icon);
      html.take(navItem).span.className('nav-item-label').text(i18n.t('*', null, item.label));
      this._navEls.set(item.path, navItem);
    };

    createNavItem(nav, DASHBOARD);
    for (const groupDef of NAV_GROUPS) {
      const group = html.take(nav).div
        .className('sidebar-nav-group' + (this.state.openGroups[groupDef.id] ? ' open' : ''))
        .getContext();
      this._groupEls.set(groupDef.id, group);
      const button = html.take(group).button
        .className('sidebar-group-button')
        .attr('type', 'button')
        .attr('aria-expanded', this.state.openGroups[groupDef.id] ? 'true' : 'false')
        .getContext();
      html.take(button).span.className('sidebar-group-label').text(groupDef.label);
      html.take(button).span.className('sidebar-group-count').text(String(groupDef.count));
      html.take(button).span.className('sidebar-group-chevron').text('⌄');
      button.addEventListener('click', () => {
        const open = !this.state.openGroups[groupDef.id];
        button.setAttribute('aria-expanded', String(open));
        this.setGroupOpen(groupDef.id, open);
      });
      const items = html.take(group).div.className('sidebar-group-items').getContext();
      groupDef.items.forEach(item => createNavItem(items, item));
    }

    menuSearchInput.addEventListener('input', () => {
      const query = menuSearchInput.value.trim().toLocaleLowerCase('vi');
      this._navEls.forEach((item) => {
        item.style.display = !query || item.dataset.search?.includes(query) ? '' : 'none';
      });
      NAV_GROUPS.forEach(groupDef => {
        const group = this._groupEls.get(groupDef.id);
        if (!group) return;
        const hasMatch = groupDef.items.some(item => item.label.toLocaleLowerCase('vi').includes(query));
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

    // ── MAIN ──
    const main = html.take(layout).div.className('app-main').getContext();

    // Header
    const header = html.take(main).header.className('app-header').getContext();

    // Global command search mirrors the reference header search while keeping
    // navigation declarative in this route registry.
    const globalSearch = html.take(header).div.className('global-search').getContext();
    const globalSearchIcon = html.take(globalSearch).span.className('global-search-icon').getContext();
    appendIcon(globalSearchIcon, 'search');
    const globalSearchInput = html.take(globalSearch).input
      .type('search')
      .attr('placeholder', 'Tìm nhanh...')
      .attr('aria-label', 'Tìm nhanh')
      .getContext();
    const globalSearchResults = html.take(globalSearch).div.className('global-search-results').getContext();
    const renderGlobalSearch = () => {
      const query = globalSearchInput.value.trim().toLocaleLowerCase('vi');
      globalSearchResults.innerHTML = '';
      if (!query) {
        globalSearchResults.classList.remove('open');
        return;
      }
      const matches = GLOBAL_SEARCH_ITEMS.filter(item => item.label.toLocaleLowerCase('vi').includes(query)).slice(0, 8);
      for (const item of matches) {
        const result = html.take(globalSearchResults).button
          .className('global-search-result')
          .attr('type', 'button')
          .text(item.label)
          .event('click', () => {
            globalSearchInput.value = '';
            globalSearchResults.classList.remove('open');
            void navigate(item.path);
          })
          .getContext();
        result.dataset.path = item.path;
      }
      if (matches.length === 0) {
        html.take(globalSearchResults).div.className('global-search-empty').text('Không tìm thấy trang').getContext();
      }
      globalSearchResults.classList.add('open');
    };
    globalSearchInput.addEventListener('input', renderGlobalSearch);
    globalSearchInput.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        globalSearchInput.value = '';
        globalSearchResults.classList.remove('open');
      }
    });

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
    const bellIcon = html.take(bellBtn).span.getContext();
    appendIcon(bellIcon, 'bell', 'Notifications');

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
