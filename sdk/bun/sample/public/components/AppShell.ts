import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';
import { NotificationPanel } from './NotificationPanel.ts';
import { ProfileMenu } from './ProfileMenu.ts';
import { AppLauncher, type LauncherApp } from './AppLauncher.ts';
import { appendIcon } from '@core3/client/components/Icon';
import { hasPermission } from '@core3/client/meta';

export type NavItem = { path: string; label: string; icon: string; permission?: string; children?: NavItem[] };
type NavGroup = { id: string; label: string; items: NavItem[] };
export type ShellMenu = { dashboard?: NavItem; groups?: NavGroup[] };

function canSeeNavItem(item: NavItem, user: any) {
  return hasPermission(user, item.permission || '');
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap(item => [item, ...flattenNavItems(item.children || [])]);
}

function formatNavLabel(label: string): string {
  if (label !== label.toLocaleUpperCase()) return label;
  return label.toLocaleLowerCase().replace(/(^|[\s&/-])(\p{L})/gu, (_match, prefix: string, character: string) => `${prefix}${character.toLocaleUpperCase()}`);
}

const THEME_STORAGE_KEY = 'core3_theme';

export class AppShell extends BaseComponent {
  _navEls: Map<string, HTMLElement>;
  _groupEls: Map<string, HTMLElement>;
  _headerTitle: HTMLElement | null;
  _notifPanel: NotificationPanel | null;
  _profileMenu: ProfileMenu | null;
  _shellToast: HTMLElement | null;
  _shellToastTimer: ReturnType<typeof setTimeout> | null;
  _languageUnsubscribe: (() => void) | null;
  _appLauncher: AppLauncher | null;
  _appLayout: HTMLElement | null;

  get menu(): ShellMenu {
    return this.state.menu || {};
  }

  closeMenus() {
    this._groupEls.forEach((group: HTMLElement) => {
      group.classList.remove('open');
      group.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
    });
    this._appLayout
      ?.querySelectorAll('.header-nav-submenu.open')
      .forEach((submenu: Element) => {
        submenu.classList.remove('open');
        submenu.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
      });
    (this.menu.groups || []).forEach(group => { this.state.openGroups[group.id] = false; });
  }

  go(path: string) {
    this.closeMenus();
    if (typeof this.state.navigate === 'function') this.state.navigate(path);
  }

  constructor(id: string, state: any) {
    super(id, { activePath: '/dashboard', title: 'Application', openGroups: {}, menu: {}, showWelcomeToast: false, ...state });
    this._navEls = new Map();  // path → div element
    this._groupEls = new Map();
    this._headerTitle = null;
    this._notifPanel = null;
    this._profileMenu = null;
    this._shellToast = null;
    this._shellToastTimer = null;
    this._languageUnsubscribe = i18n.onChange((lang: string) => {
      this.refreshLanguage();
      const refreshPage = this.state.onLanguageChange;
      if (typeof refreshPage === 'function') void refreshPage(lang);
    });
    this._appLauncher = null;
    this._appLayout = null;
  }

  refreshLanguage() {
    this._notifPanel?.refreshLanguage();
    this._profileMenu?.refreshLanguage();
    this._appLauncher?.refreshLanguage();
    this._groupEls.forEach((group, groupId) => {
      const groupDef = (this.menu.groups || []).find(candidate => candidate.id === groupId);
      const label = group.querySelector('.sidebar-group-label, .header-nav-label');
      if (groupDef && label) label.textContent = formatNavLabel(i18n.t('*', null, groupDef.label));
    });
    this._navEls.forEach((element, path) => {
      const items = flattenNavItems([this.menu.dashboard, ...(this.menu.groups || []).flatMap(group => group.items)].filter(Boolean) as NavItem[]);
      const item = items.find(candidate => candidate.path === path);
      const label = element.querySelector('.nav-item-label, .header-nav-item-label');
      if (item && label) {
        const translated = i18n.t('*', null, item.label);
        label.textContent = translated;
        element.dataset.search = translated.toLocaleLowerCase(i18n.lang);
      }
    });
    const themeButton = this._appLayout?.querySelector<HTMLButtonElement>('.theme-toggle');
    if (themeButton) {
      const label = document.documentElement.dataset.theme === 'dim'
        ? i18n.tKey('theme.use_light', {}, 'Use light theme')
        : i18n.tKey('theme.use_dark', {}, 'Use dark theme');
      themeButton.title = label;
      themeButton.setAttribute('aria-label', label);
    }
    const chatButton = this._appLayout?.querySelector<HTMLButtonElement>('.header-chat-button');
    if (chatButton) {
      const label = i18n.tKey('shell.messages', {}, 'Messages');
      chatButton.title = label;
      chatButton.setAttribute('aria-label', label);
    }
    const notificationButton = this._appLayout?.querySelector<HTMLButtonElement>('.header-notifications-button');
    if (notificationButton) {
      const label = i18n.tKey('shell.notifications', {}, 'Notifications');
      notificationButton.title = label;
      notificationButton.setAttribute('aria-label', label);
    }
  }

  setActivePath(path: string) {
    this._navEls.forEach((el: HTMLElement, p: string) => {
      el.classList.toggle('active', p === path);
    });
  }

  setNavigationVisible(visible: boolean) {
    const navigation = this._appLayout?.querySelector<HTMLElement>('.header-nav');
    if (!navigation) return;
    navigation.hidden = !visible;
  }

  setUser(user: any) {
    this.state.user = user;
    this._profileMenu?.setUser(user);
  }

  setCompanies(companies: any[]) {
    this.state.companies = Array.isArray(companies) ? companies : [];
    this._profileMenu?.setCompanies(this.state.companies);
  }

  setTitle(title: string) {
    if (this._headerTitle) this._headerTitle.textContent = title;
  }

  openAppPicker() {
    if (typeof this.state.navigate === 'function') this.state.navigate('/apps');
    else this._appLauncher?.toggle();
  }

  closeAppPicker() {
    this._appLauncher?.close();
  }

  setCurrentApp(app: LauncherApp | null) {
    this.state.currentApp = app;
    this._appLauncher?.setCurrentApp(app);
  }

  setMenu(menu: ShellMenu) {
    this.state.menu = menu || {};
    this._appLauncher?.dispose();
    this._profileMenu?.dispose();
    this._notifPanel?.dispose();
    this._appLauncher = null;
    this._profileMenu = null;
    this._notifPanel = null;
    this.redraw();
  }

  draw(container: HTMLElement) {
    const user: any = this.state.user;
    // Root layout
    const layout = html.take(container).div.className('app-layout').ele();
    this._appLayout = layout;

    // ── MAIN ──
    const main = html.take(layout).div.className('app-main').ele();

    // Header
    const header = html.take(main).header.className('app-header').ele();

    const headerLeft = html.take(header).div.className('app-header-left').ele();

    // The launcher owns its full-screen UI and interaction lifecycle.
    const apps = (this.state.apps || []) as LauncherApp[];
    this._appLauncher = new AppLauncher('app-launcher', {
      apps,
      currentApp: this.state.currentApp || apps.find((app) => app.available),
      onAppChange: (app: LauncherApp, makeDefault = false) => this.state.onAppChange?.(app, makeDefault),
      onOpen: () => this.state.navigate?.('/apps'),
      onOpenChange: (open: boolean) => layout.classList.toggle('launcher-open', open),
    });
    this._appLauncher.mount(headerLeft);

    // Primary navigation is horizontal in the header, with each group opening
    // an Odoo-style menu. Nested declarations remain nested as flyout menus.
    const headerNav = html.take(headerLeft).nav.className('header-nav').attr('aria-label', i18n.tKey('shell.main_navigation', {}, 'Main navigation')).ele();
    const closeMenuElement = (element: Element) => {
      element.classList.remove('open');
      const trigger = element.querySelector(':scope > button') as HTMLButtonElement | null;
      trigger?.setAttribute('aria-expanded', 'false');
    };
    const closeOtherTopMenus = (current: Element) => {
      headerNav.querySelectorAll('.header-nav-group.open').forEach((group: Element) => {
        if (group !== current) closeMenuElement(group);
      });
      headerNav.querySelectorAll('.header-nav-submenu.open').forEach((submenu: Element) => closeMenuElement(submenu));
    };
    const closeAllMenus = () => {
      this.closeMenus();
    };
    const createHeaderItem = (target: HTMLElement, item: NavItem, nested = false) => {
      if (!canSeeNavItem(item, user)) return;
      const children = (item.children || []).filter(child => canSeeNavItem(child, user));
      if (children.length) {
        const submenu = html.take(target).div.className(`header-nav-submenu${nested ? ' nested' : ''}`).ele();
        const trigger = html.take(submenu).button
          .className('header-nav-submenu-trigger')
          .attr('type', 'button')
          .ele();
        html.take(trigger).span.className('header-nav-item-label').text(formatNavLabel(i18n.t('*', null, item.label)));
        const triggerChevron = html.take(trigger).span.className('header-nav-chevron').ele();
        appendIcon(triggerChevron, 'chevron-right');
        const childMenu = html.take(submenu).div.className('header-nav-submenu-menu').ele();
        children.forEach(child => createHeaderItem(childMenu, child, true));
        trigger.setAttribute('aria-expanded', 'false');
        const setSubmenuOpen = (open: boolean) => {
          target.querySelectorAll(':scope > .header-nav-submenu.open').forEach((sibling: Element) => {
            if (sibling !== submenu) closeMenuElement(sibling);
          });
          submenu.classList.toggle('open', open);
          trigger.setAttribute('aria-expanded', String(open));
        };
        trigger.addEventListener('click', (event: MouseEvent) => {
          event.stopPropagation();
          setSubmenuOpen(!submenu.classList.contains('open'));
        });
        trigger.addEventListener('mouseenter', () => setSubmenuOpen(true));
        submenu.addEventListener('mouseenter', () => setSubmenuOpen(true));
        submenu.addEventListener('mouseleave', (event: MouseEvent) => {
          const relatedTarget = event.relatedTarget as Node | null;
          if (!relatedTarget || !submenu.contains(relatedTarget)) setSubmenuOpen(false);
        });
        return;
      }
      const link = html.take(target).button
        .className(`header-nav-link${this.state.activePath === item.path ? ' active' : ''}`)
        .attr('type', 'button')
        .event('click', () => {
          closeAllMenus();
          this.go(item.path);
        })
        .ele();
      if (nested) link.classList.add('header-nav-menu-item');
      const translated = i18n.t('*', null, item.label);
      link.dataset.search = translated.toLocaleLowerCase(i18n.lang);
      if (item.icon) {
        const icon = html.take(link).span.className('header-nav-item-icon').ele();
        appendIcon(icon, item.icon);
      }
      html.take(link).span.className('header-nav-item-label').text(translated);
      this._navEls.set(item.path, link);
    };

    if (this.menu.dashboard && canSeeNavItem(this.menu.dashboard, user)) {
      createHeaderItem(headerNav, this.menu.dashboard);
    }
    for (const groupDef of this.menu.groups || []) {
      const visibleItems = groupDef.items.filter(item => canSeeNavItem(item, user));
      if (!visibleItems.length) continue;
      const group = html.take(headerNav).div
        .className(`header-nav-group${this.state.openGroups[groupDef.id] ? ' open' : ''}`)
        .ele();
      this._groupEls.set(groupDef.id, group);
      const trigger = html.take(group).button
        .className('header-nav-trigger')
        .attr('type', 'button')
        .attr('aria-expanded', this.state.openGroups[groupDef.id] ? 'true' : 'false')
        .ele();
      html.take(trigger).span.className('header-nav-label').text(formatNavLabel(i18n.t('*', null, groupDef.label)));
      const menu = html.take(group).div.className('header-nav-menu').ele();
      visibleItems.forEach(item => createHeaderItem(menu, item));
      const setGroupOpen = (open: boolean) => {
        closeOtherTopMenus(group);
        (this.menu.groups || []).forEach(other => {
          if (other.id !== groupDef.id) this.state.openGroups[other.id] = false;
        });
        this.state.openGroups[groupDef.id] = open;
        group.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', String(open));
      };
      group.addEventListener('mouseenter', () => setGroupOpen(true));
      trigger.addEventListener('mouseenter', () => setGroupOpen(true));
      group.addEventListener('mouseleave', (event: MouseEvent) => {
        const relatedTarget = event.relatedTarget as Node | null;
        if (!relatedTarget || !group.contains(relatedTarget)) setGroupOpen(false);
      });
      trigger.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        setGroupOpen(!group.classList.contains('open'));
      });
    }
    document.addEventListener('click', () => {
      closeAllMenus();
    });

    // Header right — actions
    const actions = html.take(header).div.className('header-actions').ele();

    // Theme toggle mirrors the reference shell and persists the preference per browser.
    const themeButton = html.take(actions).button
      .className('header-icon-btn theme-toggle')
      .attr('type', 'button')
      .ele();
    const themeIcon = html.take(themeButton).span.ele();
    const applyTheme = (theme: 'light' | 'dim') => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      themeButton.title = theme === 'dim'
        ? i18n.tKey('theme.use_light', {}, 'Use light theme')
        : i18n.tKey('theme.use_dark', {}, 'Use dark theme');
      themeButton.setAttribute('aria-label', themeButton.title);
      themeIcon.innerHTML = '';
      appendIcon(themeIcon, theme === 'dim' ? 'sun' : 'moon');
    };
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(storedTheme === 'dim' ? 'dim' : 'light');
    themeButton.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dim' ? 'light' : 'dim');
    });

    const chatBtn = html.take(actions).button
      .className('header-icon-btn header-chat-button')
      .attr('type', 'button')
      .attr('title', i18n.tKey('shell.messages', {}, 'Messages'))
      .attr('aria-label', i18n.tKey('shell.messages', {}, 'Messages'))
      .event('click', () => this.go('/chat'))
      .ele();
    const chatIcon = html.take(chatBtn).span.ele();
    appendIcon(chatIcon, 'message');

    // Notification bell button — rendered as a container so we can add badge inside
    const bellBtn = html.take(actions).button
      .className('header-icon-btn header-notifications-button')
      .attr('title', i18n.tKey('shell.notifications', {}, 'Notifications'))
      .attr('aria-label', i18n.tKey('shell.notifications', {}, 'Notifications'))
      .ele();
    const bellIcon = html.take(bellBtn).span.ele();
    appendIcon(bellIcon, 'bell', i18n.tKey('shell.notifications', {}, 'Notifications'));

    // Notification badge (hidden until unread count > 0)
    const badge = html.take(bellBtn).span
      .className('notif-badge')
      .style('display:none')
      .ele();

    // Keep the theme switch beside notification controls, as in the reference header.
    actions.append(themeButton);

    // Keep the header compact; identity details belong in the profile menu.
    this._profileMenu = new ProfileMenu('profile-menu', {
      user,
      companies: this.state.companies || [],
      onNavigate: (path: string) => this.go(path),
      onLogout: () => this.state.onLogout?.(),
      onCompanyChange: (companyId: string) => this.state.onCompanyChange?.(companyId),
    });
    const profileMenuHost = html.take(actions).div.className('profile-menu-host').ele();
    this._profileMenu.mount(profileMenuHost);

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

    // The welcome toast is only requested for the first shell mount after login.
    if (!this.state.showWelcomeToast) return;

    const toast = html.take(document.body).div
      .className('shell-toast')
      .attr('role', 'status')
      .attr('aria-live', 'polite')
      .ele();
    const toastIcon = html.take(toast).span.className('shell-toast-icon').ele();
    appendIcon(toastIcon, 'check');
    html.take(toast).span.className('shell-toast-message').text(i18n.tKey('shell.welcome', { name: user?.name || '' }, 'Hello, {name}'));
    const toastClose = html.take(toast).button
      .className('shell-toast-close')
      .attr('type', 'button')
      .attr('aria-label', i18n.tKey('labels.close', {}, 'Close'))
      .ele();
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
    if (this._shellToastTimer) clearTimeout(this._shellToastTimer);
    this._shellToastTimer = null;
    this._notifPanel?.dispose();
    this._profileMenu?.dispose();
    this._appLauncher?.dispose();
    this._notifPanel = null;
    this._profileMenu = null;
    this._appLauncher = null;
    this._shellToast?.remove();
    this._shellToast = null;
    this._languageUnsubscribe?.();
    this._languageUnsubscribe = null;
    super.dispose();
  }

}
