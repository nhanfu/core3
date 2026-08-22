import { describe, expect, it } from 'vitest';
import { i18n } from '@core3/client/i18n';

describe('i18n key translation', () => {
  it('uses page/global catalogs, English fallback, and interpolation', () => {
    const previousLang = i18n.lang;
    const previousPage = i18n._currentPage;
    const previousCache = new Map(i18n._cache);
    i18n._cache.clear();
    i18n.hydrate('order-detail', {
      lang: 'vi',
      page: { 'order.delete_line': 'Xóa dòng {description}' },
      global: { 'labels.close': 'Đóng' },
    });

    expect(i18n.tKey('order.delete_line', { description: 'Cước' }, 'Delete line {description}')).toBe('Xóa dòng Cước');
    expect(i18n.tKey('labels.close', {}, 'Close')).toBe('Đóng');
    expect(i18n.tKey('labels.missing', {}, 'Fallback label')).toBe('Fallback label');
    expect(i18n.missingKeys).toContain('vi:labels.missing');

    i18n._cache.set('vi:order-detail', { Close: 'Đóng cửa sổ' });
    expect(i18n.text('Close')).toBe('Đóng cửa sổ');

    i18n.lang = previousLang;
    i18n._currentPage = previousPage;
    i18n._cache = previousCache;
  });
});
