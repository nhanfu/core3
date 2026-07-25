import { BaseComponent } from '@core3/framework/runtime.js';
import { html } from '@core3/framework/html.js';
import { logout, getToken } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';

export class ProfileDrawer extends BaseComponent {
  constructor(id, state) {
    super(id, { open: false, saving: false, ...state });
    this._el = null;
    this._overlay = null;
  }

  open() {
    this.state.open = true;
    if (this._el) {
      this._overlay.style.display = 'block';
      this._el.style.display = 'flex';
    } else {
      this.redraw();
    }
  }

  close() {
    this.state.open = false;
    if (this._el) {
      this._el.style.display = 'none';
      this._overlay.style.display = 'none';
    }
  }

  draw(container) {
    const user = this.state.user;
    const initials = (user?.name || 'U')
      .split(' ')
      .map(w => w[0])
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

    // ── Header ──
    const drawerHeader = html.take(this._el).div.className('drawer-header').getContext();
    html.take(drawerHeader).span.className('drawer-title').text(i18n.t('*', null, 'Profile'));
    html.take(drawerHeader).button
      .className('drawer-close')
      .text('✕')
      .event('click', () => this.close());

    // ── Body ──
    const body = html.take(this._el).div.className('drawer-body').getContext();

    // Avatar + name + email
    html.take(body).div.className('drawer-avatar').text(initials);
    html.take(body).div.className('drawer-user-name').text(user?.name || 'User');
    html.take(body).div.className('drawer-user-email').text(user?.email || '');

    // ── Language preference section ──
    const langSection = html.take(body).div.className('drawer-section').getContext();
    html.take(langSection).div.className('drawer-section-title').text('Language / Ngôn ngữ');
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
    html.take(pwSection).div.className('drawer-section-title').text('Change Password');

    const pwForm = html.take(pwSection).div.getContext();

    const pwErrorEl = html.take(pwForm).div
      .className('alert alert-error')
      .style('display:none;margin-bottom:12px')
      .getContext();

    const currentPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(currentPwGroup).label.className('form-label').text('Current password');
    const currentPwInput = html.take(currentPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const newPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(newPwGroup).label.className('form-label').text('New password');
    const newPwInput = html.take(newPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const confirmPwGroup = html.take(pwForm).div.className('form-group').getContext();
    html.take(confirmPwGroup).label.className('form-label').text('Confirm new password');
    const confirmPwInput = html.take(confirmPwGroup).input
      .type('password')
      .className('form-input')
      .attr('placeholder', '••••••••')
      .getContext();

    const changePwBtn = html.take(pwForm).button
      .className('btn btn-primary btn-sm')
      .text('Update password')
      .event('click', async () => {
        pwErrorEl.style.display = 'none';
        const current = currentPwInput.value;
        const newPw   = newPwInput.value;
        const confirm = confirmPwInput.value;

        if (!current || !newPw) {
          pwErrorEl.textContent = 'All fields required';
          pwErrorEl.style.display = 'flex';
          return;
        }
        if (newPw !== confirm) {
          pwErrorEl.textContent = 'Passwords do not match';
          pwErrorEl.style.display = 'flex';
          return;
        }
        if (newPw.length < 8) {
          pwErrorEl.textContent = 'Password must be at least 8 characters';
          pwErrorEl.style.display = 'flex';
          return;
        }

        changePwBtn.disabled = true;
        changePwBtn.textContent = 'Updating…';

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
          changePwBtn.textContent = 'Password updated ✓';
          setTimeout(() => {
            changePwBtn.textContent = 'Update password';
            changePwBtn.disabled = false;
          }, 2000);
        } catch (err) {
          pwErrorEl.textContent = err.message;
          pwErrorEl.style.display = 'flex';
          changePwBtn.textContent = 'Update password';
          changePwBtn.disabled = false;
        }
      })
      .getContext();

    // ── Footer — sign out ──
    const drawerFooter = html.take(this._el).div.className('drawer-footer').getContext();
    html.take(drawerFooter).button
      .className('btn btn-secondary btn-full')
      .text('Sign out')
      .event('click', () => {
        this.close();
        logout();
      });
  }

  async _saveLang(lang) {
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
