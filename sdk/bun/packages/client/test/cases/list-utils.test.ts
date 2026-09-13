import { describe, expect, it, vi } from 'vitest';
import { toCsv } from '@core3/client/list-utils';
describe('list CSV export', () => {
  it('uses labels and escapes comma, quote, and newline values', () => {
    expect(toCsv([{ name: 'A, "B"', note: 'one\ntwo' }], [{ field: 'name', label: 'Name' }, { field: 'note', label: 'Note' }]))
      .toBe('Name,Note\r\n"A, ""B""","one\ntwo"');
  });

  it('keeps the download anchor attached until the browser starts the file', async () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const remove = vi.spyOn(anchor, 'remove');
    const originalCreate = URL.createObjectURL;
    const create = vi.fn(() => 'blob:journal-items');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    const originalRevoke = URL.revokeObjectURL;
    const revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const { downloadCsv } = await import('@core3/client/list-utils');

    downloadCsv('journal-items-export', 'Date\r\n2026-01-15');

    expect(createElement).toHaveBeenCalledWith('a');
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('journal-items-export.csv');
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(remove).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
    createElement.mockRestore();
    appendChild.mockRestore();
    remove.mockRestore();
    if (originalCreate) Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreate });
    else delete (URL as any).createObjectURL;
    if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevoke });
    else delete (URL as any).revokeObjectURL;
  });
});

describe('list XLSX export', () => {
  it('creates a readable OOXML zip workbook with escaped cells', async () => {
    const { toXlsx } = await import('@core3/client/xlsx-utils');
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
