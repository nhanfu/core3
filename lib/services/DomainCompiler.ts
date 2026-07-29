export type DomainOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'ilike' | 'in' | 'not in' | 'is';
export type DomainClause = [string, DomainOperator, unknown];

export type CompiledDomain = { sql: string; params: unknown[] };

/** Compiles a small declarative domain into parameterized SQL using an explicit field allowlist. */
export function compileDomain(domain: DomainClause[] = [], fields: Record<string, string>): CompiledDomain {
  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const [field, operator, value] of domain) {
    const column = fields[field];
    if (!column) throw new Error(`Unknown domain field: ${field}`);
    if (operator === 'is') {
      if (value !== null && value !== true && value !== false) throw new Error(`Invalid IS value for domain field: ${field}`);
      clauses.push(`${column} IS ${value === null ? 'NULL' : value ? 'TRUE' : 'FALSE'}`);
    } else if (operator === 'in' || operator === 'not in') {
      const values = Array.isArray(value) ? value : [];
      if (!values.length) { clauses.push(operator === 'in' ? '1 = 0' : '1 = 1'); continue; }
      clauses.push(`${column} ${operator.toUpperCase()} (${values.map(() => '?').join(',')})`);
      params.push(...values);
    } else {
      clauses.push(`${column} ${operator.toUpperCase()} ?`);
      params.push(operator === 'ilike' ? `%${String(value)}%` : value);
    }
  }
  return { sql: clauses.length ? clauses.join(' AND ') : '1 = 1', params };
}
