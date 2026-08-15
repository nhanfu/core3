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
    const page = html.take(container).div.className('login-page').ele();
    const card = html.take(page).div.className('login-card').ele();
    const logo = html.take(card).div.className('login-logo').ele();
    const logoIcon = html.take(logo).div.className('login-logo-icon').ele();
    appendIcon(logoIcon, 'truck');
    html.take(logo).div.className('login-logo-title').text(d.logo_title || '');
    html.take(logo).div.className('login-logo-sub').text(d.logo_subtitle || '');
    html.take(card).div.className('login-title').text(d.title || '');

    const errorEl = html.take(card).div.className('login-error').style('display:none').ele();
    const emailInput = this.field(card, d.email || {}, 'email');
    const passwordInput = this.field(card, d.password || {}, 'password');
    const button = html.take(card).button.className('btn btn-primary btn-full').style('margin-top:8px').text(d.submit_label || '').ele() as HTMLButtonElement;
    const footer = html.take(card).div.className('login-footer').ele();
    if (d.credentials_label) html.take(footer).div.text(d.credentials_label);
    for (const credential of d.credentials || []) html.take(footer).div.text(credential);

    const submit = async () => {
      html.take(errorEl).css('display', 'none');
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        html.take(errorEl).replaceText(d.required_message || 'Email and password are required.').css('display', 'block');
        return;
      }
      html.take(button).prop('disabled', true).innerHTML(`<span class="spinner"></span> ${d.loading_label || ''}`);
      try {
        await this.submit(d.action || 'login', { email, password });
      } catch (error) {
        html.take(errorEl).replaceText(error instanceof Error ? error.message : String(error)).css('display', 'block');
        html.take(button).prop('disabled', false).replaceText(d.submit_label || '');
      }
    };
    html.take(button).event('click', () => void submit());
    for (const input of [emailInput, passwordInput]) {
      html.take(input).event('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') void submit();
      });
    }

    const providers = Array.isArray(d.providers) ? d.providers : [];
    if (providers.length) {
      const divider = html.take(card).div.className('login-provider-divider').ele();
      html.take(divider).span.text(d.provider_divider || 'Or continue with');
      const providerList = html.take(card).div.className('login-providers').ele();
      for (const provider of providers) {
        if (!provider?.action || !provider?.label) continue;
        const tone = ['indigo', 'blue', 'slate'].includes(provider.tone) ? provider.tone : 'slate';
        const providerButton = html.take(providerList).button
          .className(`btn btn-outline btn-full login-provider-button login-provider-${tone}`)
          .attr('type', 'button')
          .ele() as HTMLButtonElement;
        appendIcon(providerButton, provider.icon || 'shield');
        html.take(providerButton).span.text(provider.label);
        html.take(providerButton).event('click', () => {
          html.take(providerButton).prop('disabled', true);
          void this.submit(provider.action).catch((error) => {
            html.take(errorEl).replaceText(error instanceof Error ? error.message : String(error)).css('display', 'block');
          }).finally(() => { html.take(providerButton).prop('disabled', false); });
        });
      }
    }
    html.take(emailInput).focus();
  }

  private field(card: HTMLElement, definition: any, type: string) {
    const group = html.take(card).div.className('form-group').ele();
    html.take(group).label.className('form-label').text(definition.label || '');
    return html.take(group).input.type(type).className('form-input')
      .attr('placeholder', definition.placeholder || '')
      .attr('autocomplete', definition.autocomplete || '')
      .value(definition.default || '').ele() as HTMLInputElement;
  }
}
