import { describe, expect, it } from 'vitest';
import { toXlsx } from '../../lib/xlsx-utils.ts';
import { xlsxToCsv } from '../services/xlsx-import.ts';

describe('XLSX master-data import contract', () => {
  it('round-trips exported tabular data into the CSV import contract', () => {
    const workbook = toXlsx([
      { code: 'VN-01', name: 'Hà Nội, miền Bắc', status: 'Active', capacity: 1250 },
      { code: 'VN-02', name: 'Kho "Trung tâm"', status: 'Inactive', capacity: 0 },
    ], [
      { field: 'code', label: 'Mã' },
      { field: 'name', label: 'Tên, mô tả' },
      { field: 'status', label: 'Trạng thái' },
      { field: 'capacity', label: 'Sức chứa' },
    ]);

    expect(xlsxToCsv(workbook)).toBe([
      'Mã,"Tên, mô tả",Trạng thái,Sức chứa',
      'VN-01,"Hà Nội, miền Bắc",Active,1250',
      'VN-02,"Kho ""Trung tâm""",Inactive,0',
    ].join('\r\n'));
  });

  it('rejects workbooks without the first worksheet', () => {
    expect(() => xlsxToCsv(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toThrow('XLSX worksheet not found');
  });
});
