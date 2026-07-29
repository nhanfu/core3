import { BaseComponent } from '../runtime.ts';
import { html } from '../html.ts';
import { appendIcon } from './Icon.ts';

export type OdooShellNavItem = { id: string; label: string; icon?: string };

export type OdooShellDefinition = {
  appName?: string;
  appIcon?: string;
  nav?: OdooShellNavItem[];
  activeNav?: string;
  userName?: string;
  companyName?: string;
  notifications?: number;
  breadcrumb?: string;
};

/** Generic Odoo-like application shell. It owns navigation chrome, not domain behavior. */
export class OdooShell extends BaseComponent {
  def: OdooShellDefinition;
  private content: HTMLElement | null = null;
  private navElements = new Map<string, HTMLElement>();
  private notificationElement: HTMLElement | null = null;
  private notificationCount: HTMLElement | null = null;

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
    for (const item of this.def.nav || []) {
      const button = html.take(nav).button.className('odoo-nav-item').type('button').dataAttr('nav-id', item.id).getContext();
      if (item.icon) appendIcon(button, item.icon);
      html.take(button).span.text(item.label);
      button.addEventListener('click', () => {
        this.setActiveNav(item.id);
        void this.submit('navigate', { id: item.id });
      });
      this.navElements.set(item.id, button);
    }
    const main = html.take(root).main.className('odoo-main').getContext();
    const header = html.take(main).header.className('odoo-topbar').getContext();
    const menuButton = html.take(header).button.className('odoo-icon-button').type('button').attr('title', 'Apps').getContext();
    appendIcon(menuButton, 'menu');
    menuButton.addEventListener('click', () => root.classList.toggle('is-sidebar-open'));
    html.take(header).div.className('odoo-breadcrumb').text(this.def.breadcrumb || this.def.appName || 'CRM');
    html.take(header).div.className('odoo-topbar-spacer');
    const notification = html.take(header).button.className('odoo-icon-button odoo-notification').type('button').attr('title', 'Notifications').getContext();
    this.notificationElement = notification;
    appendIcon(notification, 'bell');
    this.setNotificationCount(this.def.notifications || 0);
    notification.addEventListener('click', () => void this.submit('notifications', {}));
    html.take(header).span.className('odoo-company').text(this.def.companyName || 'My Company');
    const user = html.take(header).button.className('odoo-user-menu').type('button').text(this.def.userName || 'Administrator').getContext();
    user.addEventListener('click', () => void this.submit('user_menu', { user: this.def.userName }));
    this.content = html.take(main).section.className('odoo-content').getContext();
    this.setActiveNav(this.state.activeNav);
  }
}
