import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplatePreview } from '../../components/TemplatePreview.ts';

describe('TemplatePreview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders template blocks as safe preview text and prints on request', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const preview = new TemplatePreview('preview', {
      template: { code: 'TPL-01', name: 'Mẫu vận đơn' },
      blocks: [
        { block_type: 'text', label: 'Tiêu đề', content: '<b>Không chạy</b>' },
        { block_type: 'token', label: 'Số đơn', token_key: 'order.order_number' },
        { block_type: 'table', label: 'Dòng hàng' },
        { block_type: 'spacer', label: 'Khoảng cách' },
      ],
    });

    preview.mount(host);

    expect(host.querySelector('.core3-template-preview')?.textContent).toContain('Mẫu vận đơn');
    expect(host.querySelector('.core3-template-preview')?.textContent).toContain('<b>Không chạy</b>');
    expect(host.querySelector('.core3-template-preview')?.textContent).toContain('{{order.order_number}}');
    expect(host.querySelector('.core3-template-preview-paper')?.getAttribute('aria-label')).toBe('Bản xem trước mẫu in');
    host.querySelector<HTMLButtonElement>('button')?.click();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('renders an explicit empty state when no blocks exist', () => {
    const host = document.createElement('div');
    new TemplatePreview('empty-preview', { template: { name: 'Mẫu trống' }, blocks: [] }).mount(host);
    expect(host.textContent).toContain('Chưa có khối nội dung.');
  });
});
