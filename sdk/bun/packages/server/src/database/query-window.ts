export type QueryWindowDefinition = {
  table: string;
  date_field: string;
  from_param?: string;
  to_param?: string;
  max_years?: number;
  deny_unbounded?: boolean;
};

export type QueryWindowBounds = {
  from: string;
  to: string;
  fromParam: string;
  toParam: string;
};

function dateValue(value: unknown, label: string): string {
  const result = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw Object.assign(new Error(`${label} must be an ISO date`), { code: 'QUERY_RANGE_NOT_ALLOWED', status: 400 });
  }
  return result;
}

function rollingWindow(years: number): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const fromDate = new Date(now);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - years);
  return { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) };
}

export function resolveQueryWindow(definition: QueryWindowDefinition, params: Record<string, unknown>): QueryWindowBounds {
  const fromParam = definition.from_param || 'from_date';
  const toParam = definition.to_param || 'to_date';
  const fromValue = params[fromParam];
  const toValue = params[toParam];
  if (definition.deny_unbounded !== false && (fromValue == null || toValue == null || fromValue === '' || toValue === '')) {
    throw Object.assign(new Error('A bounded date range is required for this datasource'), { code: 'QUERY_RANGE_NOT_ALLOWED', status: 400 });
  }
  const from = dateValue(fromValue, fromParam);
  const to = dateValue(toValue, toParam);
  if (from >= to) throw Object.assign(new Error('The datasource date range is empty or reversed'), { code: 'QUERY_RANGE_NOT_ALLOWED', status: 400 });
  if (definition.max_years) {
    const allowed = rollingWindow(definition.max_years);
    if (from < allowed.from || to > allowed.to) {
      throw Object.assign(new Error('The requested date range is outside the permitted window'), {
        code: 'QUERY_RANGE_NOT_ALLOWED',
        status: 400,
        allowed_from: allowed.from,
        allowed_to: allowed.to,
      });
    }
  }
  return { from, to, fromParam, toParam };
}
