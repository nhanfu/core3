import { describe, expect, it } from 'vitest';
import { i18n } from '@core3/client/i18n';

describe('declarative i18n maps', () => {
  it('translates declarative control labels and date preset labels', () => {
    i18n.hydrate('orders', {
      lang: 'vi',
      page: { Filters: 'Bộ lọc', Today: 'Hôm nay' },
    });
    const translated = i18n.translatePageConfig('orders', {
      page: { id: 'orders' },
      components: [{
        type: 'ListView',
        labels: { filters: 'Filters' },
        date_range: { preset_labels: { today: 'Today' } },
      }],
    });

    expect(translated.components[0].labels.filters).toBe('Bộ lọc');
    expect(translated.components[0].date_range.preset_labels.today).toBe('Hôm nay');
  });

  it('translates date range validation messages', () => {
    i18n.hydrate('orders-validation', {
      lang: 'vi',
      page: {
        Apply: 'Áp dụng',
        'Last 12 months': '12 tháng qua',
        'The date range cannot be longer than {max_years} years.': 'Khoảng ngày không được dài hơn {max_years} năm.',
      },
    });
    const translated = i18n.translatePageConfig('orders-validation', {
      components: [{
        type: 'ListView',
        date_range: {
          validation_messages: {
            max_years: 'The date range cannot be longer than {max_years} years.',
          },
          apply_label: 'Apply',
          preset_labels: { last_12_months: 'Last 12 months' },
        },
      }],
    });

    expect(translated.components[0].date_range.validation_messages.max_years)
      .toBe('Khoảng ngày không được dài hơn {max_years} năm.');
    expect(translated.components[0].date_range.apply_label).toBe('Áp dụng');
    expect(translated.components[0].date_range.preset_labels.last_12_months).toBe('12 tháng qua');
  });

  it('translates chatter action and detail label maps', () => {
    i18n.hydrate('order-detail', {
      lang: 'vi',
      page: {
        Created: 'Đã tạo',
        'Order created': 'Khởi tạo đơn hàng',
        'Send message': 'Gửi tin nhắn',
        'Write a message...': 'Nhập tin nhắn...',
      },
    });
    const translated = i18n.translatePageConfig('order-detail', {
      components: [{
        type: 'OdooFormView',
        message_label: 'Send message',
        message_placeholder: 'Write a message...',
        message_action_labels: { created: 'Created' },
        message_detail_labels: { 'Order created': 'Order created' },
      }],
    });

    expect(translated.components[0].message_action_labels.created).toBe('Đã tạo');
    expect(translated.components[0].message_detail_labels['Order created']).toBe('Khởi tạo đơn hàng');
    expect(translated.components[0].message_label).toBe('Gửi tin nhắn');
    expect(translated.components[0].message_placeholder).toBe('Nhập tin nhắn...');
  });
});
