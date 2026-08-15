import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { getToken } from '../app.ts';
import { i18n } from '@core3/client/i18n';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { PageRuntime } from '@core3/client/components/PageRoot';
import { appendIcon } from '@core3/client/components/Icon';

/** Generic right-side modal that renders a YAML page. */
export class RightModal extends BaseComponent {
  _el: HTMLElement | null = null;
  _overlay: HTMLElement | null = null;
  _pageSlot: HTMLElement | null = null;
  _titleEl: HTMLElement | null = null;
  _escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any) {
    super(id, { open: false, ...state });
  }

  open() {
    this.state.open = true;
    if (this._el && this._overlay) {
      this._overlay.style.display = 'block';
      this._el.style.display = 'flex';
    } else {
      this.redraw();
    }
  }

  close() {
    this.state.open = false;
    if (this._el) this._el.style.display = 'none';
    if (this._overlay) this._overlay.style.display = 'none';
  }

  dispose() {
    this.close();
    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._escapeHandler = null;
    this._overlay?.remove();
    this._el?.remove();
    this._overlay = null;
    this._el = null;
    this._pageSlot = null;
    this._titleEl = null;
    super.dispose();
  }

  refreshLanguage() {
    if (this._pageSlot) void this.renderYamlPage();
  }

  draw(container: HTMLElement) {
    const t = (text: string) => i18n.t('*', null, text);
    this._overlay = html.take(container).div
      .className('right-modal-overlay')
      .style('display:none')
      .event('click', () => this.close())
      .ele();
    this._el = html.take(container).div
      .className('right-modal')
      .style('display:none')
      .ele();

    this._escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.state.open) this.close();
    };
    document.addEventListener('keydown', this._escapeHandler);

    const header = html.take(this._el).div.className('right-modal-header').ele();
    this._titleEl = html.take(header).span.className('drawer-title').text(t(this.state.title || this.state.page_id || '')).ele();
    const closeButton = html.take(header).button
      .className('right-modal-close')
      .attr('type', 'button')
      .attr('aria-label', t('Close'))
      .event('click', () => this.close())
      .ele();
    appendIcon(closeButton, 'x');

    this._pageSlot = html.take(this._el).div.className('drawer-body right-modal-page').ele();
    void this.renderYamlPage();
    if (this.state.open) this.open();
  }

  private async renderYamlPage() {
    if (!this._pageSlot) return;
    const pageId = String(this.state.page_id || '').trim();
    if (!pageId) {
      this._pageSlot.textContent = 'Modal page is not configured';
      return;
    }
    try {
      const token = getToken();
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}?lc=${encodeURIComponent(i18n.lang)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Failed to load page (${response.status})`);
      const config = await response.json();
      if (config.i18n) {
        i18n.hydrate(pageId, config.i18n);
        delete config.i18n;
      }
      validatePageDefinition(config, { allowExternalSources: true });
      if (this._titleEl) this._titleEl.textContent = i18n.t(pageId, null, config.title || this.state.title || pageId);
      const translatedConfig = i18n.translatePageConfig(pageId, config);
      await new PageRuntime(translatedConfig, new Map(), this.state.context || {}).render(this._pageSlot);
    } catch (error) {
      this._pageSlot.textContent = error instanceof Error ? error.message : String(error);
    }
  }
}
