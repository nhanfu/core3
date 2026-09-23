import { describe, expect, it } from 'vitest';
import { readWorkbook } from '../../src/spreadsheet/engine';
import { SpreadsheetWorkbook } from '../../src/components/SpreadsheetWorkbook';
import { validatePageDefinition } from '@core3/server/yaml/schema';

describe('Spreadsheet workbook boundary', () => {
  it('normalizes legacy cells without changing the stored input', () => {
    const input = { version: 1, sheets: [{ name: 'Sales', cells: { A1: '10', B1: '=A1+1' } }] };
    const output = readWorkbook(input);
    expect(output.sheets[0]).toMatchObject({ id: 'sheet-1', cells: { A1: '10', B1: '=A1+1' } });
    expect(input.sheets[0]).not.toHaveProperty('id');
  });

  it('preserves engine metadata and rejects unreadable or empty snapshots', () => {
    const input = { version: '18.4.3', sheets: [{ id: 'a', cells: { A1: '2' } }], revisionId: 'revision-2', styles: { 1: { bold: true } } };
    expect(readWorkbook(JSON.stringify(input))).toEqual(input);
    for (const invalid of ['broken', '{}', null, { sheets: [] }]) expect(() => readWorkbook(invalid)).toThrow();
  });

  it('resolves only the declared workbook source', () => {
    const definition = { type: 'SpreadsheetWorkbook', source: 'book', mode: 'readonly' };
    expect(SpreadsheetWorkbook.resolveState(definition, { dataMap: { book: { data: [{ id: 'a' }] }, other: { data: [{ id: 'secret' }] } } }).workbook).toEqual({ id: 'a' });
  });

  it('validates editor mode, export type, source, and declared save action', () => {
    const page = (component: any) => ({
      page: { id: 'workbook' },
      datasources: [{ id: 'book', permission: 'spreadsheet.read', query: 'SELECT 1' }],
      components: [{ type: 'SpreadsheetWorkbook', source: 'book', mode: 'readonly', ...component }],
    });
    expect(() => validatePageDefinition(page({}))).not.toThrow();
    expect(() => validatePageDefinition(page({ mode: 'invalid' }))).toThrow();
    expect(() => validatePageDefinition(page({ allow_export: 'true' }))).toThrow();
    expect(() => validatePageDefinition(page({ source: 'unknown' }))).toThrow();
    expect(() => validatePageDefinition(page({ save_action: 'unknown' }))).toThrow();
  });
});
