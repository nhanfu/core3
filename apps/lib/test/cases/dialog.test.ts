import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '../../components/Dialog.ts';

describe('Dialog', () => {
  it('supports accessible input confirmation and Escape dismissal', () => {
    const host = document.createElement('div');
    const onConfirm = vi.fn();
    new Dialog('status-dialog', { open: true }, {
      title: 'Add status',
      input: { label: 'Status name' },
      onConfirm,
    }).mount(host);

    const dialog = host.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('label')?.textContent).toContain('Status name');

    const input = dialog.querySelector('input') as HTMLInputElement;
    input.value = 'In transit';
    dialog.querySelector<HTMLButtonElement>('.core3-dialog-confirm')!.click();
    expect(onConfirm).toHaveBeenCalledWith('In transit');
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    const secondHost = document.createElement('div');
    new Dialog('status-dialog-escape', { open: true }).mount(secondHost);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(secondHost.querySelector('[role="dialog"]')).toBeNull();
  });
});
