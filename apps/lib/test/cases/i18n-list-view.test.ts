import { describe, expect, it } from 'vitest';
import { i18n } from '../../i18n.ts';

describe('ListView i18n maps', () => {
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
});
