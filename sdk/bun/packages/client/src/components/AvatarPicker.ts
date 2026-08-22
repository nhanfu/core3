import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export class AvatarPicker extends BaseComponent {
  private previousAvatarUrl = '';

  static resolveState(_definition: any, context: any) {
    return { user: context.user || {} };
  }

  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
    this.previousAvatarUrl = String(state.user?.avatar_url || '');
  }

  private initials() {
    return String(this.state.user?.name || 'U').split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase();
  }

  private avatarUrl() {
    const value = String(this.state.user?.avatar_url || '').trim();
    return /^(?:data:image\/[a-z0-9.+-]+;base64,|https?:\/\/|\/)/i.test(value) ? value : '';
  }

  draw(container: HTMLElement) {
    const user = this.state.user || {};
    const header = html.take(container).div.className('profile-header').ele();
    const picker = html.take(header).div.className('profile-avatar-picker').ele();
    const avatar = html.take(picker).button.className('profile-avatar avatar-picker-button').type('button')
      .attr('title', 'Change profile photo').attr('aria-label', 'Change profile photo').ele() as HTMLButtonElement;
    this.renderAvatar(avatar);
    const input = html.take(picker).input.type('file').attr('accept', 'image/*').className('avatar-picker-input').ele() as HTMLInputElement;
    avatar.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file || file.size > 512 * 1024) { input.value = ''; return; }
      const reader = new FileReader();
      reader.addEventListener('load', async () => {
        if (typeof reader.result !== 'string') return;
        try {
          this.state.user = { ...this.state.user, avatar_url: reader.result };
          this.renderAvatar(avatar, true);
          await this._onAction?.(this.def.action, { avatar_url: reader.result });
          this.previousAvatarUrl = reader.result;
        } catch {
          this.state.user = { ...this.state.user, avatar_url: this.previousAvatarUrl };
          this.renderAvatar(avatar, true);
        } finally { input.value = ''; }
      }, { once: true });
      reader.readAsDataURL(file);
    });
    const identity = html.take(header).div.className('profile-avatar-identity').ele();
    html.take(identity).div.className('profile-user-name').text(user.name || 'User');
    html.take(identity).div.className('profile-user-email').text(user.email || '');
  }

  private renderAvatar(parent: HTMLElement, redraw = false) {
    if (redraw) html.take(parent).clear();
    const url = this.avatarUrl();
    if (url) html.take(parent).img.className('profile-avatar-image').attr('src', url).attr('alt', 'Profile photo');
    else html.take(parent).span.className('profile-avatar-initials').text(this.initials());
    html.take(parent).span.className('avatar-picker-overlay').text('Change');
  }
}
