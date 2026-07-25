import { html } from '@core3/framework/html.js';
import { setAuth, navigate } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';

export async function mount(container) {
  // Wrap in login page layout
  const page = html.take(container).div.className('login-page').getContext();
  const card = html.take(page).div.className('login-card').getContext();

  // Logo
  const logo = html.take(card).div.className('login-logo').getContext();
  html.take(logo).div.className('login-logo-icon').text('🚛');
  html.take(logo).div.className('login-logo-title').text('TMS');
  html.take(logo).div.className('login-logo-sub').text('Transport Management System');

  // Title
  html.take(card).div.className('login-title').text(i18n.t('*', null, 'Sign in') + ' to your account');

  // Error banner (hidden by default)
  const errorEl = html.take(card).div.className('login-error').style('display:none').getContext();

  // Email field
  const emailGroup = html.take(card).div.className('form-group').getContext();
  html.take(emailGroup).label.className('form-label').text('Email');
  const emailInput = html.take(emailGroup).input
    .type('email')
    .className('form-input')
    .attr('placeholder', 'you@company.com')
    .attr('autocomplete', 'email')
    .value('admin@tms.local')
    .getContext();

  // Password field
  const pwGroup = html.take(card).div.className('form-group').getContext();
  html.take(pwGroup).label.className('form-label').text('Password');
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
    .text(i18n.t('*', null, 'Sign in'))
    .getContext();

  // Demo credentials footer
  const footer = html.take(card).div.className('login-footer').getContext();
  html.take(footer).div.text('Demo credentials:');
  html.take(footer).div.text('admin@tms.local / admin123');
  html.take(footer).div.text('manager@tms.local / fleet123');

  async function doLogin() {
    const email    = emailInput.value.trim();
    const password = pwInput.value;
    errorEl.style.display = 'none';

    if (!email || !password) {
      errorEl.textContent = 'Email and password are required.';
      errorEl.style.display = 'block';
      return;
    }

    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }

      const { token, user } = await res.json();
      await setAuth(token, user);
      await navigate('/fleet');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      btnEl.disabled = false;
      btnEl.textContent = i18n.t('*', null, 'Sign in');
    }
  }

  btnEl.addEventListener('click', doLogin);

  // Allow Enter key on either field
  [emailInput, pwInput].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // Auto-focus email on load
  emailInput.focus();
}
