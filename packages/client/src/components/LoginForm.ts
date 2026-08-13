import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

/** Declarative authentication form used by YAML pages. */
export class LoginForm extends BaseComponent {
  readonly def: any;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const d = this.def;
    const page = html.take(container).div.className('login-page').getContext();
    const card = html.take(page).div.className('login-card').getContext();
    const logo = html.take(card).div.className('login-logo').getContext();
    const logoIcon = html.take(logo).div.className('login-logo-icon').getContext();
    appendIcon(logoIcon, 'truck');
    html.take(logo).div.className('login-logo-title').text(d.logo_title || '');
    html.take(logo).div.className('login-logo-sub').text(d.logo_subtitle || '');
    html.take(card).div.className('login-title').text(d.title || '');

    const errorEl = html.take(card).div.className('login-error').style('display:none').getContext();
    const emailInput = this.field(card, d.email || {}, 'email');
    const passwordInput = this.field(card, d.password || {}, 'password');
    const button = html.take(card).button.className('btn btn-primary btn-full').style('margin-top:8px').text(d.submit_label || '').getContext() as HTMLButtonElement;
    const footer = html.take(card).div.className('login-footer').getContext();
    if (d.credentials_label) html.take(footer).div.text(d.credentials_label);
    for (const credential of d.credentials || []) html.take(footer).div.text(credential);

    const submit = async () => {
      errorEl.style.display = 'none';
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        errorEl.textContent = d.required_message || 'Email and password are required.';
        errorEl.style.display = 'block';
        return;
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner"></span> ${d.loading_label || ''}`;
      try {
        await this.submit(d.action || 'login', { email, password });
      } catch (error) {
        errorEl.textContent = error instanceof Error ? error.message : String(error);
        errorEl.style.display = 'block';
        button.disabled = false;
        button.textContent = d.submit_label || '';
      }
    };
    button.addEventListener('click', () => void submit());
    for (const input of [emailInput, passwordInput]) {
      input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') void submit();
      });
    }

    const providers = Array.isArray(d.providers) ? d.providers : [];
    if (providers.length) {
      const divider = html.take(card).div.className('login-provider-divider').getContext();
      html.take(divider).span.text(d.provider_divider || 'Or continue with');
      const providerList = html.take(card).div.className('login-providers').getContext();
      for (const provider of providers) {
        if (!provider?.action || !provider?.label) continue;
        const tone = ['indigo', 'blue', 'slate'].includes(provider.tone) ? provider.tone : 'slate';
        const providerButton = html.take(providerList).button
          .className(`btn btn-outline btn-full login-provider-button login-provider-${tone}`)
          .attr('type', 'button')
          .getContext() as HTMLButtonElement;
        appendIcon(providerButton, provider.icon || 'shield');
        const providerLabel = document.createElement('span');
        providerLabel.textContent = provider.label;
        providerButton.append(providerLabel);
        providerButton.addEventListener('click', () => {
          providerButton.disabled = true;
          void this.submit(provider.action).catch((error) => {
            errorEl.textContent = error instanceof Error ? error.message : String(error);
            errorEl.style.display = 'block';
          }).finally(() => { providerButton.disabled = false; });
        });
      }
    }
    emailInput.focus();
  }

  private field(card: HTMLElement, definition: any, type: string) {
    const group = html.take(card).div.className('form-group').getContext();
    html.take(group).label.className('form-label').text(definition.label || '');
    return html.take(group).input.type(type).className('form-input')
      .attr('placeholder', definition.placeholder || '')
      .attr('autocomplete', definition.autocomplete || '')
      .value(definition.default || '').getContext() as HTMLInputElement;
  }
}
