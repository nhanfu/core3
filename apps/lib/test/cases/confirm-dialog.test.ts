import { describe, expect, it } from 'vitest';
import { ConfirmDialog } from '@core3/client/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('uses the Vietnamese shell defaults used by TMS pages', () => {
    const container = document.createElement('div');
    new ConfirmDialog('confirm', { open: true }).mount(container);

    expect(container.textContent).toContain('Xác nhận');
    expect(container.textContent).toContain('Bạn có chắc chắn không?');
    expect(container.textContent).toContain('Hủy');
  });
});
