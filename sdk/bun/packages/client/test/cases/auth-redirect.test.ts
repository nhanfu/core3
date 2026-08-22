import { describe, expect, it } from 'vitest';
import { loginPath, safeRedirect } from '@core3/client/auth-redirect';

describe('auth redirect', () => {
  it('keeps an internal path and query string', () => {
    expect(safeRedirect('/order/orders?status=Draft#lines', 'http://localhost'))
      .toBe('/order/orders?status=Draft#lines');
  });

  it('rejects external redirect targets', () => {
    expect(safeRedirect('https://example.com/account', 'http://localhost')).toBeNull();
    expect(safeRedirect('//example.com/account', 'http://localhost')).toBeNull();
  });

  it('encodes the return target in the login URL', () => {
    expect(loginPath('/order/orders?status=Draft', 'vi')).toBe(
      '/auth/login?redirect=%2Forder%2Forders%3Fstatus%3DDraft&lc=vi',
    );
  });
});
