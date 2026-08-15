import { describe, expect, it } from 'vitest';
import { showToast, toastTypeForError } from '@core3/client/components/Toast';

describe('showToast', () => {
  it('classifies stale-record conflicts as warnings', () => {
    expect(toastTypeForError({ code: 'STALE_RECORD' })).toBe('warning');
    expect(toastTypeForError({ code: 'INTERNAL_ERROR' })).toBe('error');
  });

  it('mounts an actionable toast and removes it when closed', () => {
    showToast('Record was changed by another user.', 'error');

    const host = document.body.querySelector('.core3-toast-host') as HTMLElement;
    expect(host).not.toBeNull();
    expect(host.querySelector('.core3-toast-error')?.textContent).toContain('Unable to complete');
    expect(host.querySelector('.core3-toast-message')?.textContent).toContain('Record was changed by another user.');

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.body.querySelector('.core3-toast-host')).toBeNull();
  });
});
