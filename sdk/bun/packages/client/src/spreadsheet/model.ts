/** Shared engine entry point without CSS/templates; usable in the server worker. */
import { registerWorkbookFunctions } from './functions';
let loaded: Promise<any> | undefined;
export function loadSpreadsheetModel() {
  return loaded ||= import('@odoo/o-spreadsheet/dist/o_spreadsheet.esm.js').then(engine => { registerWorkbookFunctions(engine); return engine; });
}

/** Normalize only Core3's original placeholder format; leave engine versions intact. */
export function readWorkbook(value: unknown): Record<string, any> {
  const data = typeof value === 'string' ? JSON.parse(value) : structuredClone(value);
  if (!data || typeof data !== 'object' || !Array.isArray(data.sheets) || !data.sheets.length) throw new Error('The workbook has no readable sheets.');
  if (data.version !== 1) return data;
  return {
    sheets: data.sheets.map((sheet: any, index: number) => ({
      id: String(sheet.id || `sheet-${index + 1}`), name: sheet.name || `Sheet${index + 1}`,
      colNumber: sheet.colNumber || 26, rowNumber: sheet.rowNumber || 100,
      cells: Object.fromEntries(Object.entries(sheet.cells || {}).map(([address, cell]) => [
        address, String(typeof cell === 'object' && cell !== null ? (cell as any).content ?? '' : cell ?? ''),
      ])),
    })),
  };
}
