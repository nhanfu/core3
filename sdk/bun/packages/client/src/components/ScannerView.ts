import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type ScannerViewDefinition = {
  type?: string;
  source?: string;
  fullscreen?: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  scan_label?: string;
  helper_text?: string;
  labels?: Record<string, string>;
};

export type ScannerViewOptions = {
  canScan?: boolean;
  onScan?: (barcode: string) => Promise<void> | void;
};

/**
 * Narrow, device-neutral scanner contract for client actions.
 *
 * A hardware scanner that behaves like a keyboard wedge can submit through
 * this input. Camera/device adapters can be added later without changing the
 * page YAML or the named action contract.
 */
export class ScannerView extends BaseComponent {
  private readonly definition: ScannerViewDefinition;
  private readonly options: ScannerViewOptions;

  constructor(id: string, state: any = {}, definition: ScannerViewDefinition = {}, options: ScannerViewOptions = {}) {
    super(id, state);
    this.definition = definition;
    this.options = options;
  }

  draw(container: HTMLElement) {
    const labels = this.definition.labels || {};
    const desk = this.state.desk || {};
    const deskState = String(this.state.scan_state || desk.desk_state || 'ready');
    const message = String(
      this.state.scan_message
        || desk.status_message
        || labels[deskState]
        || labels.ready
        || 'Ready to scan an attendee badge.',
    );
    const canScan = this.options.canScan !== false;
    const result = this.state.result || null;
    const root = html.take(container).section
      .className(`o-registration-desk${this.definition.fullscreen === false ? '' : ' is-fullscreen'}`)
      .attr('data-scanner-contract', 'barcode-input')
      .ele() as HTMLElement;

    const header = html.take(root).div.className('o-registration-desk-header').ele();
    const eyebrow = html.take(header).span.className('o-registration-desk-eyebrow').ele();
    html.take(eyebrow).replaceText('Events / Registration Desk');
    html.take(header).h1.className('o-registration-desk-title').replaceText(this.definition.title || 'Registration Desk');
    if (this.definition.description) html.take(header).p.className('o-registration-desk-description').replaceText(this.definition.description);

    const body = html.take(root).div.className('o-registration-desk-body').ele();
    const scanStage = html.take(body).div.className('o-registration-desk-scan-stage').ele();
    const frame = html.take(scanStage).div.className(`o-registration-desk-scan-frame is-${deskState}`).attr('aria-hidden', 'true').ele();
    html.take(frame).span.className('o-registration-desk-scan-corner corner-top-left').ele();
    html.take(frame).span.className('o-registration-desk-scan-corner corner-top-right').ele();
    html.take(frame).span.className('o-registration-desk-scan-corner corner-bottom-left').ele();
    html.take(frame).span.className('o-registration-desk-scan-corner corner-bottom-right').ele();
    html.take(frame).span.className('o-registration-desk-scan-icon').replaceText('⌁');
    html.take(scanStage).h2.className('o-registration-desk-scan-heading').replaceText('Scan attendee badge');
    html.take(scanStage).p.className('o-registration-desk-scan-help').replaceText(this.definition.helper_text || 'Use a barcode scanner or enter the badge code below.');

    const scanForm = html.take(scanStage).form.className('o-registration-desk-scan-form').ele() as HTMLFormElement;
    const input = html.take(scanForm).input
      .type('text')
      .className('o-registration-desk-scan-input')
      .attr('autocomplete', 'off')
      .attr('autocapitalize', 'off')
      .attr('spellcheck', 'false')
      .attr('placeholder', this.definition.placeholder || 'Scan or enter badge code')
      .attr('aria-label', this.definition.placeholder || 'Scan or enter badge code')
      .prop('disabled', !canScan)
      .ele() as HTMLInputElement;
    const button = html.take(scanForm).button
      .type('submit')
      .className('o-registration-desk-scan-button')
      .replaceText(this.definition.scan_label || 'Check in')
      .prop('disabled', !canScan)
      .ele() as HTMLButtonElement;
    const submit = async (event?: Event) => {
      event?.preventDefault();
      const barcode = input.value.trim();
      if (!barcode || !canScan || !this.options.onScan) return;
      html.take(button).prop('disabled', true).replaceText(labels.scanning || 'Checking…');
      this.setState({ scan_state: 'scanning', scan_message: labels.scanning || 'Checking badge…' });
      try {
        await this.options.onScan(barcode);
        input.value = '';
      } catch (error) {
        this.setState({
          scan_state: 'error',
          scan_message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        html.take(button).prop('disabled', false).replaceText(this.definition.scan_label || 'Check in');
        if (canScan) input.focus();
      }
    };
    scanForm.addEventListener('submit', event => void submit(event));

    const status = html.take(scanStage).div
      .className(`o-registration-desk-status is-${deskState}`)
      .attr('role', 'status')
      .attr('aria-live', 'polite')
      .ele();
    html.take(status).strong.className('o-registration-desk-status-label').replaceText(
      labels[deskState] || (deskState === 'valid' ? 'Checked in' : deskState === 'error' ? 'Unable to check in' : 'Scanner status'),
    );
    html.take(status).span.className('o-registration-desk-status-message').replaceText(message);

    if (!canScan) {
      html.take(scanStage).div.className('o-registration-desk-permission').replaceText('Registration permission is required to check in attendees.');
    }

    const context = html.take(body).aside.className('o-registration-desk-context').ele();
    html.take(context).div.className('o-registration-desk-context-heading').replaceText('Active event');
    if (desk.desk_state === 'empty') {
      html.take(context).div.className('o-registration-desk-empty').replaceText('No active event is available for registration.');
    } else {
      html.take(context).h2.className('o-registration-desk-event-name').replaceText(String(desk.event_name || 'Conference for Architects'));
      const details = html.take(context).add('dl').className('o-registration-desk-details').ele();
      this.detail(details, 'Event code', desk.event_id || 'event-demo-002');
      this.detail(details, 'Capacity', desk.capacity === 0 ? 'Unlimited' : `${desk.registered || 0} / ${desk.capacity}`);
      if (desk.remaining !== undefined) this.detail(details, 'Seats left', desk.remaining);
      if (result) {
        const resultCard = html.take(context).div.className('o-registration-desk-result').ele();
        html.take(resultCard).span.className('o-registration-desk-result-label').replaceText('Latest check-in');
        html.take(resultCard).strong.replaceText(String(result.attendee_name || result.name || 'Attendee'));
        if (result.event_name) html.take(resultCard).span.replaceText(String(result.event_name));
      }
    }
  }

  private detail(parent: HTMLElement, label: string, value: unknown) {
    const row = html.take(parent).div.className('o-registration-desk-detail').ele();
    html.take(row).add('dt').replaceText(label);
    html.take(row).add('dd').replaceText(String(value ?? '—'));
  }
}
