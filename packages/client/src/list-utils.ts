/** Escape a value for an RFC 4180-compatible CSV cell. */
export function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Export visible list columns without introducing a browser dependency. */
export function toCsv(rows: Record<string, unknown>[], columns: Array<{ field: string; label?: string }>): string {
  return [columns.map(column => csvCell(column.label || column.field)).join(','), ...rows.map(row => columns.map(column => csvCell(row[column.field])).join(','))].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
