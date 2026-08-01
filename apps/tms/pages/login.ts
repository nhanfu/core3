import { html } from '../../lib/html.ts';
import { appendIcon } from '../../lib/components/Icon.ts';
import { getDefaultRoute, setAuth } from '../../app.ts';
import { i18n } from '../i18n.ts';

export async function mount(container: HTMLElement) {
  // Wrap in login page layout
  const page = html.take(container).div.className('login-page').getContext();
  const card = html.take(page).div.className('login-card').getContext();

  // Logo
  const logo = html.take(card).div.className('login-logo').getContext();
  const logoIcon = html.take(logo).div.className('login-logo-icon').getContext();
  appendIcon(logoIcon, 'truck');
  html.take(logo).div.className('login-logo-title').text('MovedX');
  html.take(logo).div.className('login-logo-sub').text('Điều xe & Quản lý vận tải');

  // Title
  html.take(card).div.className('login-title').text(i18n.t('login', null, 'Sign in to your account'));

  // Error banner (hidden by default)
  const errorEl = html.take(card).div.className('login-error').style('display:none').getContext();

  // Email field
  const emailGroup = html.take(card).div.className('form-group').getContext();
  html.take(emailGroup).label.className('form-label').text(i18n.t('login', null, 'Email'));
  const emailInput = html.take(emailGroup).input
    .type('email')
    .className('form-input')
    .attr('placeholder', 'you@company.com')
    .attr('autocomplete', 'email')
    .value('admin@tms.local')
    .getContext();

  // Password field
  const pwGroup = html.take(card).div.className('form-group').getContext();
  html.take(pwGroup).label.className('form-label').text(i18n.t('login', null, 'Password'));
  const pwInput = html.take(pwGroup).input
    .type('password')
    .className('form-input')
    .attr('placeholder', '••••••••')
    .attr('autocomplete', 'current-password')
    .value('admin123')
    .getContext();

  // Submit button
  const btnEl = html.take(card).button
    .className('btn btn-primary btn-full')
    .style('margin-top:8px')
    .text(i18n.t('login', null, 'Sign in'))
    .getContext();

  // Demo credentials footer
  const footer = html.take(card).div.className('login-footer').getContext();
  html.take(footer).div.text(i18n.t('login', null, 'Demo credentials:'));
  html.take(footer).div.text('admin@tms.local / admin123');
  html.take(footer).div.text('manager@tms.local / fleet123');

  async function doLogin() {
    const email    = emailInput.value.trim();
    const password = pwInput.value;
    errorEl.style.display = 'none';

    if (!email || !password) {
      errorEl.textContent = i18n.t('login', null, 'Email and password are required.');
      errorEl.style.display = 'block';
      return;
    }

    btnEl.disabled = true;
    btnEl.innerHTML = `<span class="spinner"></span> ${i18n.t('login', null, 'Signing in...')}`;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || i18n.t('login', null, 'Invalid credentials'));
      }

      const { token, user } = await res.json();
      await setAuth(token, user);
      // Hash-only navigation would reuse the unauthenticated document and
      // bypass bootstrap's shell mount. Reload after setting the target hash
      // so the authenticated application frame is created first. replaceState
      // avoids firing an unauthenticated hashchange render just before reload.
      window.history.replaceState(null, '', `#${getDefaultRoute(user)}`);
      window.location.reload();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : String(err);
      errorEl.style.display = 'block';
      btnEl.disabled = false;
      btnEl.textContent = i18n.t('login', null, 'Sign in');
    }
  }

  btnEl.addEventListener('click', doLogin);

  // Allow Enter key on either field
  [emailInput, pwInput].forEach((el) => {
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // Auto-focus email on load
  emailInput.focus();
}
