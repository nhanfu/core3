import { BaseComponent } from '@core3/framework/runtime.ts';
import { html } from '@core3/framework/html.ts';
import { navigate, logout, getUser } from '../app.ts';
import { i18n } from '../i18n.ts';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileDrawer } from './ProfileDrawer.ts';

type NavItem = { path: string; label: string; icon: string };
type NavGroup = { id: string; label: string; count: number; items: NavItem[] };

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

    // Nav
    const nav = html.take(sidebar).nav.className('sidebar-nav').getContext();
    const createNavItem = (target: HTMLElement, item: NavItem) => {
      const isActive = this.state.activePath === item.path;
      const navItem = html.take(target).button
        .className('nav-item' + (isActive ? ' active' : ''))
        .attr('type', 'button')
        .event('click', () => navigate(item.path))
        .getContext();
      html.take(navItem).span.className('nav-item-icon').text(item.icon);
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
