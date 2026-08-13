import { describe, expect, it } from 'vitest';
import { toCsv } from '@core3/client/list-utils';
describe('list CSV export', () => {
  it('uses labels and escapes comma, quote, and newline values', () => {
    expect(toCsv([{ name: 'A, "B"', note: 'one\ntwo' }], [{ field: 'name', label: 'Name' }, { field: 'note', label: 'Note' }]))
      .toBe('Name,Note\r\n"A, ""B""","one\ntwo"');
  });
});

describe('list XLSX export', () => {
  it('creates a readable OOXML zip workbook with escaped cells', async () => {
    const { toXlsx } = await import('../../xlsx-utils.ts');
    const workbook = toXlsx([{ code: 'A&B', amount: 12 }], [
      { field: 'code', label: 'Code' },
      { field: 'amount', label: 'Amount' },
    ]);
    const bytes = new TextDecoder().decode(workbook);
    expect(workbook.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    expect(bytes).not.toContain('A&B');
    expect(workbook.length).toBeGreaterThan(500);
  });
});
