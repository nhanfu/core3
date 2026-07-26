import { describe, expect, it } from 'vitest';
import { toCsv } from '@core3/frontend';
describe('list CSV export', () => {
  it('uses labels and escapes comma, quote, and newline values', () => {
    expect(toCsv([{ name: 'A, "B"', note: 'one\ntwo' }], [{ field: 'name', label: 'Name' }, { field: 'note', label: 'Note' }]))
      .toBe('Name,Note\r\n"A, ""B""","one\ntwo"');
  });
});
