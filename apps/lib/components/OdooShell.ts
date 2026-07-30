import { BaseComponent } from '../runtime.ts';
import { html } from '../html.ts';
import { appendIcon } from './Icon.ts';
import { AppLauncher } from './AppLauncher.ts';
import type { AppManifest } from '../services/AppRegistry.ts';

export type OdooShellNavItem = { id: string; label: string; icon?: string; action?: string; children?: OdooShellNavItem[] };

export type OdooShellDefinition = {
  appName?: string;
  appIcon?: string;
  nav?: OdooShellNavItem[];
  activeNav?: string;
  userName?: string;
  companyName?: string;
  notifications?: number;
  breadcrumb?: string;
  apps?: AppManifest[];
  activeApp?: string;
  companies?: Array<{ id: string; label: string }>;
  activeCompany?: string;
};

/** Generic Odoo-like application shell. It owns navigation chrome, not domain behavior. */
export class OdooShell extends BaseComponent {
  def: OdooShellDefinition;
  private content: HTMLElement | null = null;
  private navElements = new Map<string, HTMLElement>();
  private notificationElement: HTMLElement | null = null;
  private notificationCount: HTMLElement | null = null;
  private launcher: AppLauncher | null = null;
  private companyElement: HTMLElement | null = null;
  private breadcrumbElement: HTMLElement | null = null;

  constructor(id: string, def: OdooShellDefinition = {}) {
    super(id, { activeNav: def.activeNav || '' });
    this.def = def;
  }

  get contentElement() { return this.content; }

  setNotificationCount(count: number) {
    this.notificationCount?.remove();
    this.notificationCount = null;
    if (count && this.notificationElement) this.notificationCount = html.take(this.notificationElement).span.className('odoo-notification-count').text(String(count)).getContext();
  }

  setActiveNav(id: string) {
    this.state.activeNav = id;
    for (const [itemId, element] of this.navElements) {
      element.classList.toggle('is-active', itemId === id);
    }
    const item = findNavItem(this.def.nav || [], id);
    if (this.breadcrumbElement && item) this.breadcrumbElement.textContent = `${this.def.appName || 'CRM'} / ${item.label}`;
  }

  setCompany(company: string) {
    this.def.activeCompany = company;
    if (this.companyElement instanceof HTMLSelectElement) this.companyElement.value = company;
    else if (this.companyElement) this.companyElement.textContent = company;
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('odoo-shell').getContext();
    const sidebar = html.take(root).aside.className('odoo-sidebar').getContext();
    const brand = html.take(sidebar).div.className('odoo-brand').getContext();
    const mark = html.take(brand).span.className('odoo-brand-mark').getContext();
    appendIcon(mark, this.def.appIcon || 'grid');
    const brandText = html.take(brand).div.getContext();
    html.take(brandText).strong.text(this.def.appName || 'CRM');
    html.take(brandText).small.text(this.def.companyName || 'My Company');
    const menuTitle = html.take(sidebar).div.className('odoo-sidebar-label').text(this.def.appName || 'CRM').getContext();
    const nav = html.take(sidebar).nav.className('odoo-nav').getContext();
    renderNavItems(nav, this.def.nav || [], 0, (item, button) => {
      button.addEventListener('click', () => {
        if (!item.action && item.children?.length) return;
        this.setActiveNav(item.id);
        void this.submit('navigate', { id: item.id });
      });
      this.navElements.set(item.id, button);
    });
    const main = html.take(root).main.className('odoo-main').getContext();
    const header = html.take(main).header.className('odoo-topbar').getContext();
    const appButton = html.take(header).button.className('odoo-icon-button odoo-app-button').type('button').attr('title', 'Applications').getContext();
    appendIcon(appButton, 'dashboard');
    const launcherHost = html.take(root).div.className('odoo-app-launcher-host').getContext();
    this.launcher = new AppLauncher(`${this.id}-launcher`, { apps: this.def.apps, activeApp: this.def.activeApp });
    this.launcher._onAction = async (action: string, params: any) => action === 'select' ? this.submit('app_switch', params) : undefined;
    this.launcher.mount(launcherHost);
    appButton.addEventListener('click', () => this.launcher?.setOpen(!this.launcher?.state.open));
    const menuButton = html.take(header).button.className('odoo-icon-button odoo-sidebar-button').type('button').attr('title', 'Menu').getContext();
    appendIcon(menuButton, 'menu');
    menuButton.addEventListener('click', () => root.classList.toggle('is-sidebar-open'));
    this.breadcrumbElement = html.take(header).div.className('odoo-breadcrumb').text(this.def.breadcrumb || this.def.appName || 'CRM').getContext();
    const command = html.take(header).button.className('odoo-icon-button odoo-command-search').type('button').attr('title', 'Command search').getContext();
    appendIcon(command, 'search');
    command.addEventListener('click', () => void this.submit('command_search', {}));
    html.take(header).div.className('odoo-topbar-spacer');
    const notification = html.take(header).button.className('odoo-icon-button odoo-notification').type('button').attr('title', 'Notifications').getContext();
    this.notificationElement = notification;
    appendIcon(notification, 'bell');
    this.setNotificationCount(this.def.notifications || 0);
    notification.addEventListener('click', () => void this.submit('notifications', {}));
    if (this.def.companies?.length) {
      const company = html.take(header).select.className('odoo-company-switcher').attr('aria-label', 'Company').getContext() as HTMLSelectElement;
      for (const item of this.def.companies) html.take(company).option.attr('value', item.id).text(item.label);
      company.value = this.def.activeCompany || this.def.companies[0].id;
      company.addEventListener('change', () => void this.submit('company_switch', { company: company.value }));
      this.companyElement = company;
    } else {
      this.companyElement = html.take(header).span.className('odoo-company').text(this.def.companyName || 'My Company').getContext();
    }
    const user = html.take(header).button.className('odoo-user-menu').type('button').text(this.def.userName || 'Administrator').getContext();
    user.addEventListener('click', () => void this.submit('user_menu', { user: this.def.userName }));
    this.content = html.take(main).section.className('odoo-content').getContext();
    this.setActiveNav(this.state.activeNav);
  }
}

function findNavItem(items: OdooShellNavItem[], id: string): OdooShellNavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findNavItem(item.children || [], id);
    if (child) return child;
  }
  return undefined;
}

function renderNavItems(
  container: HTMLElement,
  items: OdooShellNavItem[],
  level: number,
  onClick: (item: OdooShellNavItem, button: HTMLButtonElement) => void,
) {
  for (const item of items) {
    const button = html.take(container).button.className(`odoo-nav-item odoo-nav-level-${level}`).type('button').dataAttr('nav-id', item.id).getContext();
    if (item.icon) appendIcon(button, item.icon);
    html.take(button).span.text(item.label);
    onClick(item, button);
    if (item.children?.length) {
      const children = html.take(container).div.className('odoo-nav-children').getContext();
      renderNavItems(children, item.children, level + 1, onClick);
    }
  }
}
