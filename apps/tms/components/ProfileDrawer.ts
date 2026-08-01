import { BaseComponent } from '../../lib/runtime.ts';
import { html } from '../../lib/html.ts';
import { logout, getToken } from '../public/app.ts';
import { i18n } from '../i18n.ts';
import { appendIcon } from '../../lib/components/Icon.ts';

export class ProfileDrawer extends BaseComponent {
  _el: HTMLElement | null;
  _overlay: HTMLElement | null;
  _escapeHandler: ((event: KeyboardEvent) => void) | null;

  constructor(id: string, state: any) {
    super(id, { open: false, saving: false, ...state });
    this._el = null;
    this._overlay = null;
    this._escapeHandler = null;
  }

  open() {
    this.state.open = true;
    if (this._el) {
      if (this._overlay) this._overlay.style.display = 'block';
      this._el.style.display = 'flex';
    } else {
      this.redraw();
    }
  }

  close() {
    this.state.open = false;
    if (this._el) {
      this._el.style.display = 'none';
      if (this._overlay) this._overlay.style.display = 'none';
    }
  }

  dispose() {
    this.close();
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    this._overlay?.remove();
    this._el?.remove();
    this._overlay = null;
    this._el = null;
    super.dispose();
  }

  refreshLanguage() {
    if (!this._el) return;
    const t = (text: string) => i18n.t('*', null, text);
    const sectionTitles = this._el.querySelectorAll('.drawer-section-title');
    if (sectionTitles[0]) sectionTitles[0].textContent = t('Language');
    if (sectionTitles[1]) sectionTitles[1].textContent = t('Change Password');
    const labels = this._el.querySelectorAll('.form-label');
    ['Current password', 'New password', 'Confirm new password'].forEach((key, index) => {
      if (labels[index]) labels[index].textContent = t(key);
    });
    const updateButton = this._el.querySelector('.btn-primary');
    if (updateButton && !this.state.saving) updateButton.textContent = t('Update password');
    const title = this._el.querySelector('.drawer-title');
    if (title) title.textContent = t('Profile');
  }

  draw(container: HTMLElement) {
    const t = (text: string) => i18n.t('*', null, text);
    const user: any = this.state.user;
    const initials = (user?.name || 'U')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Overlay backdrop
    this._overlay = html.take(container).div
      .className('profile-drawer-overlay')
      .style('display:none')
      .event('click', () => this.close())
      .getContext();

    // Drawer panel
    this._el = html.take(container).div
      .className('profile-drawer')
      .style('display:none')
      .getContext();

    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.state.open) this.close();
    };
    document.addEventListener('keydown', this._escapeHandler);

    // ── Header ──
    const drawerHeader = html.take(this._el).div.className('drawer-header').getContext();
    html.take(drawerHeader).span.className('drawer-title').text(t('Profile'));
    const closeButton = html.take(drawerHeader).button
      .className('drawer-close')
      .attr('aria-label', t('Close'))
      .event('click', () => this.close())
      .getContext();
    appendIcon(closeButton, 'x');

    // ── Body ──
    const body = html.take(this._el).div.className('drawer-body').getContext();

    // Avatar + name + email
    html.take(body).div.className('drawer-avatar').text(initials);
    html.take(body).div.className('drawer-user-name').text(user?.name || 'User');
    html.take(body).div.className('drawer-user-email').text(user?.email || '');

    // ── Language preference section ──
    const langSection = html.take(body).div.className('drawer-section').getContext();
    html.take(langSection).div.className('drawer-section-title').text(t('Language'));
    const langGroup = html.take(langSection).div.className('lang-radio-group').getContext();

    const enCard = html.take(langGroup).div
      .className('lang-radio' + (i18n.lang === 'en' ? ' selected' : ''))
      .text('🇺🇸 English')
      .getContext();

    const viCard = html.take(langGroup).div
      .className('lang-radio' + (i18n.lang === 'vi' ? ' selected' : ''))
      .text('🇻🇳 Tiếng Việt')
      .getContext();

    enCard.addEventListener('click', async () => {
      await i18n.setLang('en');
      enCard.classList.add('selected');
      viCard.classList.remove('selected');
      await this._saveLang('en');
    });

    viCard.addEventListener('click', async () => {
      await i18n.setLang('vi');
      viCard.classList.add('selected');
      enCard.classList.remove('selected');
      await this._saveLang('vi');
    });

    // ── Change password section ──
    const pwSection = html.take(body).div.className('drawer-section').getContext();
    html.take(pwSection).div.className('drawer-section-title').text(t('Change Password'));

    const pwForm = html.take(pwSection).div.getContext();

    const pwErrorEl = html.take(pwForm).div
      .className('alert alert-error')
      .style('display:none;margin-bottom:12px')
      .getContext();

    const currentPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(currentPwGroup).label.className('form-label').text(t('Current password'));
    const currentPwInput = html.take(currentPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const newPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(newPwGroup).label.className('form-label').text(t('New password'));
    const newPwInput = html.take(newPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const confirmPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(confirmPwGroup).label.className('form-label').text(t('Confirm new password'));
    const confirmPwInput = html.take(confirmPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const changePwBtn = html.take(pwForm).button
      .className('btn btn-primary btn-sm')
      .text(t('Update password'))
      .event('click', async () => {
        pwErrorEl.style.display = 'none';
        const current = currentPwInput.value;
        const newPw   = newPwInput.value;
        const confirm = confirmPwInput.value;

        if (!current || !newPw) {
          pwErrorEl.textContent = t('All fields required');
          pwErrorEl.style.display = 'flex';
          return;
        }
        if (newPw !== confirm) {
          pwErrorEl.textContent = t('Passwords do not match');
          pwErrorEl.style.display = 'flex';
          return;
        }
        if (newPw.length < 8) {
          pwErrorEl.textContent = t('Password must be at least 8 characters');
          pwErrorEl.style.display = 'flex';
          return;
        }

        changePwBtn.disabled = true;
        changePwBtn.textContent = t('Updating…');

        try {
          const token = getToken();
          const res = await fetch('/api/v1/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ current_password: current, new_password: newPw }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update password');
          }
          currentPwInput.value = '';
          newPwInput.value = '';
          confirmPwInput.value = '';
          changePwBtn.textContent = t('Password updated ✓');
          setTimeout(() => {
            changePwBtn.textContent = t('Update password');
            changePwBtn.disabled = false;
          }, 2000);
        } catch (err) {
          pwErrorEl.textContent = err instanceof Error ? err.message : String(err);
          pwErrorEl.style.display = 'flex';
          changePwBtn.textContent = t('Update password');
          changePwBtn.disabled = false;
        }
      })
      .getContext();

    // ── Footer — sign out ──
    const drawerFooter = html.take(this._el).div.className('drawer-footer').getContext();
    html.take(drawerFooter).button
      .className('btn btn-secondary btn-full')
      .text(t('Sign out'))
      .event('click', () => {
        this.close();
        logout();
      });
  }

  async _saveLang(lang: string) {
    try {
      const token = getToken();
      await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_lang: lang }),
      });
    } catch {
      // silently ignore
    }
  }
}
