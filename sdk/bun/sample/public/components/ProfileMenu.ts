import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

export class ProfileMenu extends BaseComponent {
  private _menu: HTMLElement | null = null;
  private _outsideHandler: ((event: MouseEvent) => void) | null = null;
  private _escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any) {
    super(id, { open: false, ...state });
  }

  private initials() {
    return String(this.state.user?.name || 'U')
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  open() {
    this.state.open = true;
    this._menu?.classList.add('open');
    this._menu?.removeAttribute('hidden');
    this._container?.querySelector('.profile-menu-trigger')?.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.state.open = false;
    this._menu?.classList.remove('open');
    this._menu?.setAttribute('hidden', '');
    this._container?.querySelector('.profile-menu-trigger')?.setAttribute('aria-expanded', 'false');
  }

  toggle() {
    if (this.state.open) this.close();
    else this.open();
  }

  refreshLanguage() {
    if (!this._container) return;
    if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);
    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._outsideHandler = null;
    this._escapeHandler = null;
    this.redraw();
  }

  draw(container: HTMLElement) {
    const user = this.state.user || {};
    const wrapper = html.take(container).div.className('profile-menu').ele();
    const trigger = html.take(wrapper).button
      .className('avatar-btn profile-menu-trigger')
      .attr('type', 'button')
      .attr('title', user.name || i18n.tKey('shell.profile', {}, 'Profile'))
      .attr('aria-label', user.name || i18n.tKey('shell.profile', {}, 'Profile'))
      .attr('aria-haspopup', 'menu')
      .attr('aria-expanded', 'false')
      .event('click', (event: MouseEvent) => {
        event.stopPropagation();
        this.toggle();
      })
      .text(this.initials())
      .ele();

    this._menu = html.take(wrapper).div
      .className('profile-menu-panel')
      .attr('role', 'menu')
      .attr('hidden', '')
      .ele();
    const summary = html.take(this._menu).div.className('profile-menu-summary').ele();
    html.take(summary).div.className('profile-menu-avatar').text(this.initials());
    const identity = html.take(summary).div.className('profile-menu-identity').ele();
    html.take(identity).div.className('profile-menu-name').text(user.name || 'User');
    html.take(identity).div.className('profile-menu-email').text(user.email || '');

    const addAction = (label: string, action: () => void, variant = '') => {
      const className = variant ? 'profile-menu-item ' + variant : 'profile-menu-item';
      html.take(this._menu!).button
        .className(className)
        .attr('type', 'button')
        .attr('role', 'menuitem')
        .text(label)
        .event('click', () => {
          this.close();
          action();
        })
        .ele();
    };
    addAction(i18n.tKey('shell.my_profile', {}, 'My profile'), () => this.state.onNavigate?.('/auth/profile'));
    addAction(i18n.tKey('shell.preferences', {}, 'Preferences'), () => this.state.onNavigate?.('/auth/profile#preferences'));
    addAction(i18n.tKey('shell.change_password', {}, 'Change password'), () => this.state.onNavigate?.('/auth/profile#security'));
    const separator = html.take(this._menu).div.className('profile-menu-separator').ele();
    separator.setAttribute('role', 'separator');
    addAction(i18n.tKey('shell.sign_out', {}, 'Sign out'), () => this.state.onLogout?.(), 'is-danger');

    this._outsideHandler = (event: MouseEvent) => {
      if (!wrapper.contains(event.target as Node)) this.close();
    };
    this._escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.state.open) {
        this.close();
        (trigger as HTMLButtonElement).focus();
      }
    };
    document.addEventListener('click', this._outsideHandler);
    document.addEventListener('keydown', this._escapeHandler);
    if (this.state.open) this.open();
  }

  dispose() {
    if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);
    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._outsideHandler = null;
    this._escapeHandler = null;
    this._menu = null;
    super.dispose();
  }
}
