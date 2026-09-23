/** Shared query semantics for interactive cells and isolated server rendering. */
export function workbookDataQuery(catalog: Map<string, any>, sourceKey: unknown, field: unknown, row: unknown, filterJson: unknown) {
  if (typeof sourceKey !== 'string' || typeof field !== 'string' || typeof row !== 'number' || !Number.isSafeInteger(row) || row < 1 || typeof filterJson !== 'string' || filterJson.length > 8192) throw new Error('Invalid Core3 datasource arguments');
  const source = catalog.get(sourceKey);
  if (!source || !source.columns.some((column: any) => column.field === field)) throw new Error('Datasource or field unavailable to your account');
  let filters: any;
  try { filters = JSON.parse(filterJson); } catch { throw new Error('Datasource filters must be a JSON object'); }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('Datasource filters must be a JSON object');
  const top = Math.min(50, source.max_rows), skip = Math.floor((row - 1) / top) * top;
  const key = JSON.stringify([sourceKey, Object.keys(filters).sort().map(name => [name, filters[name]]), skip]);
  return { key, field, index: row - 1 - skip, query: { source: sourceKey, filters, skip, top } };
}

export function workbookDataValue(data: any[], index: number, field: string) {
  const record = data[index];
  if (!record) throw new Error('Datasource record is unavailable');
  const value = record[field];
  if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Datasource value cannot be used in a cell');
  return value ?? '';
}
