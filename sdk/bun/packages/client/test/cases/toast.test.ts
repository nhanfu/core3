import { describe, expect, it } from 'vitest';
import { showToast } from '@core3/client/components/Toast';

describe('showToast', () => {
  it('mounts an actionable toast and removes it when closed', () => {
    showToast('Record was changed by another user.', 'error');

    const host = document.body.querySelector('.core3-toast-host') as HTMLElement;
    expect(host).not.toBeNull();
    expect(host.querySelector('.core3-toast-error')?.textContent).toContain('Record was changed by another user.');

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.body.querySelector('.core3-toast-host')).toBeNull();
  });
});
