export type Change = { field: string; value: any };
export function normalizeLineValues(values: Record<string, unknown>, hasCost: boolean) {
  const description = String(values.description || '').trim();
  const unit = String(values.unit || '').trim() || 'Chuyến';
  const quantity = Number(values.quantity);
  const unitPrice = Number(values.unit_price);
  const costPrice = hasCost ? Number(values.cost_price) : 0;
  const taxRate = Number(values.tax_rate || 0);
  if (!description) throw { status: 400, message: 'description required' };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw { status: 400, message: 'quantity must be greater than zero' };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw { status: 400, message: 'unit_price must be zero or greater' };
  }
  if (hasCost && (!Number.isFinite(costPrice) || costPrice < 0)) {
    throw { status: 400, message: 'cost_price must be zero or greater' };
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw { status: 400, message: 'tax_rate must be between zero and 100' };
  }
  return {
    description,
    unit,
    quantity,
    unitPrice,
    costPrice,
    taxRate,
    lineTotal: Math.round(quantity * unitPrice * (1 + taxRate / 100) * 100) / 100,
    costTotal: Math.round(quantity * costPrice * 100) / 100,
  };
}

export function normalizeContactValues(values: Record<string, unknown>) {
  const name = String(values.name || '').trim();
  const roleTitle = String(values.role_title || '').trim();
  const phone = String(values.phone || '').trim();
  const email = String(values.email || '').trim().toLowerCase();
  const notes = String(values.notes || '').trim();
  const isPrimary = values.is_primary === true || String(values.is_primary).toLowerCase() === 'true';
  if (!name) throw { status: 400, message: 'contact name required' };
  if (!phone && !email) throw { status: 400, message: 'contact phone or email required' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, message: 'invalid contact email' };
  }
  return { name, roleTitle, phone, email, notes, isPrimary };
}


export function convertRow(row: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? Number(value) : value instanceof Date ? value.toISOString() : value,
  ]));
}

export function runOnConnection(conn: any, sql: string, params: any[] = []): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    conn.run(sql, ...params, (err: any) => (err ? reject(err) : resolve()));
  });
}

export function queryOnConnection(conn: any, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    conn.all(sql, ...params, (err: any, rows: any[]) => {
      if (err) return reject(err);
      resolve((rows || []).map(convertRow));
    });
  });
}

export function redactQueryValue(key: string, value: unknown) {
  if (value === null || value === undefined) return value;
  if (/(password|token|secret|authorization|current_user_name)/i.test(key)) return '[REDACTED]';
  if (typeof value === 'string' && value.length > 200) return `${value.slice(0, 200)}…`;
  return value;
}

export function describeQueryError(error: unknown) {
  if (!error || typeof error !== 'object') return { message: String(error) };
  const candidate = error as Record<string, unknown>;
  return {
    name: candidate.name,
    message: candidate.message,
    errno: candidate.errno,
    errorType: candidate.errorType,
    code: candidate.code,
    stack: candidate.stack,
  };
}

export function bindNamedParams(sql: string, params: Record<string, any> = {}) {
  const values: any[] = [];
  const statement = sql.trim().replace(/;\s*$/, '').replace(/:([A-Za-z_]\w*)/g, (_: string, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) {
      // Do not bind NULL as a parameter. DuckDB cannot always resolve the
      // type of an untyped NULL placeholder in predicates such as
      // `:status IS NULL`.
      return 'NULL';
    }
    values.push(value);
    // DuckDB also cannot infer the type of a parameter used only by an
    // `IS NULL` branch. Keep every named value explicitly typed; datasource
    // queries add narrower casts for dates and other non-text expressions.
    return 'CAST(? AS VARCHAR)';
  });
  return { statement, values };
}

export function splitSQL(sql: string): string[] {
  const noComments = sql.replace(/--[^\n]*/g, '');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}
