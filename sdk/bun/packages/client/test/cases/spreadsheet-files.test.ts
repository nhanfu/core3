// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { exportWorkbookXlsx, readWorkbookXlsx } from '../../src/spreadsheet/files';

describe('Workbook file boundaries', () => {
  const parts = { '[Content_Types].xml': strToU8('<Types/>'), 'xl/workbook.xml': strToU8('<workbook/>') };
  it('preserves image bytes alongside XML parts', async () => {
    const bytes = await exportWorkbookXlsx({ exportXLSX: () => ({ files: [
      { path: 'xl/workbook.xml', content: '<workbook/>' },
      { path: 'xl/media/image1.png', imageSrc: 'data:image/png;base64,AQIDBA==' },
    ] }) });
    expect(Array.from(unzipSync(bytes)['xl/media/image1.png'])).toEqual([1, 2, 3, 4]);
    await expect(exportWorkbookXlsx({ exportXLSX: () => ({ files: [{ path: 'xl/media/image1.png', imageSrc: 'https://external.invalid/image.png' }] }) })).rejects.toThrow('embedded image');
  });
  it('rejects oversized expansion, excessive entries, traversal and XML entities', () => {
    expect(() => readWorkbookXlsx(zipSync(parts), 10, 100)).toThrow('import limit');
    expect(() => readWorkbookXlsx(zipSync(parts), 10000, 1)).toThrow('import limit');
    expect(() => readWorkbookXlsx(zipSync({ ...parts, '../escape': strToU8('x') }), 10000, 100)).toThrow('archive path');
    expect(() => readWorkbookXlsx(zipSync({ ...parts, 'xl/workbook.xml': strToU8('<!DOCTYPE x><workbook/>') }), 10000, 100)).toThrow('entities');
    expect(() => readWorkbookXlsx(zipSync({ unrelated: strToU8('x') }), 10000, 100)).toThrow('XLSX');
  });
});
