import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScannerView } from '@core3/client/components/ScannerView';

function mount(component: ScannerView) {
  const container = document.createElement('div');
  component.mount(container);
  return container;
}

describe('ScannerView generic contract', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('submits a keyboard-wedge barcode through the scan callback', async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    const container = mount(new ScannerView('registration-scanner', {
      desk: { desk_state: 'ready', event_name: 'Conference for Architects', capacity: 180, registered: 3, remaining: 177 },
    }, { title: 'Registration Desk' }, { onScan }));

    const input = container.querySelector<HTMLInputElement>('[data-scanner-contract] input')!;
    input.value = 'BADGE-REGISTERED-002';
    container.querySelector<HTMLFormElement>('.o-registration-desk-scan-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onScan).toHaveBeenCalledWith('BADGE-REGISTERED-002'));
    expect(container.querySelector('.o-registration-desk-event-name')?.textContent).toContain('Conference for Architects');
  });

  it('renders a permission boundary without enabling scanner controls', () => {
    const container = mount(new ScannerView('registration-scanner', {
      desk: { desk_state: 'capacity', status_message: 'This event has reached capacity.' },
    }, { title: 'Registration Desk' }, { canScan: false }));

    expect(container.querySelector('.o-registration-desk-scan-input')).toHaveProperty('disabled', true);
    expect(container.querySelector('.o-registration-desk-scan-button')).toHaveProperty('disabled', true);
    expect(container.textContent).toContain('Registration permission is required');
    expect(container.textContent).toContain('This event has reached capacity.');
  });
});
