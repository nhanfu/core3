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
    if (value === undefined || value === null) return 'NULL';
    values.push(value);
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
