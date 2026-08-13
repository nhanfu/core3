import { bindNamedParams, describeQueryError, redactQueryValue } from '@core3/server/database/sql';
import { resolveQueryWindow, type QueryWindowDefinition } from './database/query-window.ts';

export const datasourceMethods = {
  querySource: async function(this: any,
    source: { id?: string; query: string; single?: boolean; pivot?: any; query_window?: QueryWindowDefinition },
    params: Record<string, any> = {},
    skip = 0,
    top = 25,
    facetField?: string,
    sort?: { field?: unknown; direction?: unknown },
    pivot?: any,
  ): Promise<any> {
    const bounds = source.query_window ? resolveQueryWindow(source.query_window, params) : undefined;
    const release = bounds && this.prepareQueryWindow
      ? await this.prepareQueryWindow(source.query_window, bounds)
      : undefined;
    try {
      return await querySourceInternal.call(this, source, params, skip, top, facetField, sort, pivot);
    } finally {
      await release?.();
    }
  },
};

async function querySourceInternal(this: any,
    source: { id?: string; query: string; single?: boolean; pivot?: any },
    params: Record<string, any> = {},
    skip = 0,
    top = 25,
    facetField?: string,
    sort?: { field?: unknown; direction?: unknown },
    pivot?: any,
  ): Promise<any> {
    const { statement, values } = bindNamedParams(source.query, params);
    const pivotResult = pivot
      ? await nativePivotStatement(this, statement, values, source.pivot, pivot)
      : { statement, values };
    const pivotStatement = pivotResult.statement;
    const queryValues = pivotResult.values || values;
    const diagnostics = {
      sourceId: source.id || '<anonymous>',
      single: source.single === true,
      params: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, redactQueryValue(key, value)])),
      statement: pivotStatement,
      boundValueTypes: queryValues.map(value => value === null ? 'null' : typeof value),
      boundValueCount: queryValues.length,
    };
    const runQuery = async (phase: string, sql: string, queryValues: any[]) => {
      try {
        return await this.query(sql, queryValues);
      } catch (error) {
        console.error('[core3][datasource-query] failed', {
          ...diagnostics,
          phase,
          sql,
          queryValueTypes: queryValues.map(value => value === null ? 'null' : typeof value),
          error: describeQueryError(error),
        });
        throw error;
      }
    };
    if (source.single) {
      const rows = await runQuery('single', statement, values);
      return { data: rows[0] || {} };
    }

    const [count] = await runQuery('count', `SELECT COUNT(*) AS n FROM (${pivotStatement}) AS source_rows`, queryValues);
    const total = Number(count?.n || 0);
    const pageSize = pivot ? Math.max(1, total) : Math.max(1, Math.min(Number(top) || 25, 100));
    const offset = Math.max(0, Number(skip) || 0);
    const sortField = typeof sort?.field === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(sort.field)
      ? sort.field
      : null;
    const sortDirection = sort?.direction === 'desc' ? 'DESC' : 'ASC';
    const sortClause = sortField ? ` ORDER BY source_rows."${sortField}" ${sortDirection} NULLS LAST` : '';
    const rows = await runQuery('rows',
      pivot
        ? `SELECT * FROM (${pivotStatement}) AS source_rows${sortClause}`
        : `SELECT * FROM (${pivotStatement}) AS source_rows${sortClause} LIMIT ? OFFSET ?`,
      pivot ? queryValues : [...queryValues, pageSize, offset],
    );
    const meta: any = { total, page: Math.floor(offset / pageSize) + 1, pageSize, pages: Math.ceil(total / pageSize) };
    if (pivotResult.columns) meta.pivotColumns = pivotResult.columns;
    if (facetField && /^[A-Za-z_][A-Za-z0-9_]*$/.test(facetField)) {
      try {
        const facetRows = await this.query(

          `SELECT CAST(source_rows."${facetField}" AS VARCHAR) AS value, COUNT(*) AS n FROM (${pivotStatement}) AS source_rows GROUP BY source_rows."${facetField}"`,
          queryValues,
        );
        meta.facets = Object.fromEntries(facetRows.map((row: any) => [String(row.value ?? ''), Number(row.n || 0)]));
      } catch {
        // Facets are optional enrichment; a legacy projection without the
        // requested field must not make the underlying list unavailable.
        meta.facets = {};
      }
    }
    return {
      data: rows,
      meta,
    };
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max']);
const NULL_PIVOT_VALUE = '__core3_null__';
const quoteIdentifier = (value: unknown, label: string) => {
  const identifier = String(value || '');
  if (!IDENTIFIER.test(identifier)) throw Object.assign(new Error(`${label} must be a safe identifier`), { status: 400 });
  return `"${identifier}"`;
};

async function nativePivotStatement(repository: any, statement: string, values: any[], declaration: any, request: any): Promise<{ statement: string; values: any[]; columns?: Array<{ values: string[]; prefix: string }> }> {
  const allowed = new Set(Array.isArray(declaration?.fields) ? declaration.fields.map(String) : []);
  if (!allowed.size) throw Object.assign(new Error('Datasource does not declare pivot fields'), { status: 400 });
  const rows = Array.isArray(request.rows) ? request.rows : request.rowField ? [request.rowField] : [];
  const columns = Array.isArray(request.columns) ? request.columns : request.columnField ? [request.columnField] : [];
  const dateRanges = request.ranges || request.dateRanges || {};
  const measures = Array.isArray(request.measures) ? request.measures : [{ field: request.measureField, aggregate: request.aggregate || 'sum', label: request.measureLabel }];
  if (!measures.length) throw Object.assign(new Error('Pivot requires at least one measure'), { status: 400 });
  const checkField = (field: unknown, label: string) => {
    const name = String(field || '');
    if (!allowed.has(name)) throw Object.assign(new Error(`${label} is not declared as pivotable`), { status: 400 });
    return quoteIdentifier(name, label);
  };
  const rowSql = rows.map((field: unknown) => checkField(field, 'Pivot row field'));
  const columnSql = columns.map((field: unknown) => checkField(field, 'Pivot column field'));
  const rangedFields = [...new Set([...rows, ...columns].map(String))].filter(field => validDateRange(dateRanges[field]));
  const sourceWithParams = pivotDateSource(statement, rangedFields, dateRanges);
  const measureSql = measures.map((measure: any, index: number) => {
    const aggregate = String(measure?.aggregate || 'sum').toLowerCase();
    if (!AGGREGATES.has(aggregate)) throw Object.assign(new Error(`Unsupported pivot aggregate: ${aggregate}`), { status: 400 });
    const expression = aggregate === 'count' && !measure.field ? 'count(*)' : `${aggregate}(${checkField(measure.field, `Pivot measure ${index + 1}`)})`;
    const alias = String(measure.label || `${aggregate}_${measure.field || 'rows'}`)
      .trim()
      .replace(/[^A-Za-z0-9_]+/g, '_')
      .replace(/^[^A-Za-z_]+/, '') || `${aggregate}_${measure.field || 'rows'}`;
    return `${expression} AS ${quoteIdentifier(alias, 'Pivot measure label')}`;
  });
  const groupBy = rowSql.length ? ` GROUP BY ${rowSql.join(', ')}` : '';
  if (!columns.length) {
    return { statement: `SELECT ${[...rowSql, ...measureSql].join(', ')} FROM (${sourceWithParams}) AS pivot_source${groupBy}`, values };
  }
  const distinctRows = await repository.query(
    `SELECT DISTINCT ${columnSql.join(', ')} FROM (${sourceWithParams}) AS pivot_values`,
    values,
  );
  if (!distinctRows.length) {
    // DuckDB treats IN (NULL) as an implicit, data-extracted pivot. That form
    // is rejected when the source query contains bound parameters, which is
    // common after filters remove every pivot column value.
    return {
      statement: `SELECT ${[...rowSql, ...measureSql].join(', ')} FROM (${pivotDateSource(inlineBoundParameters(statement, values), rangedFields, dateRanges)}) AS pivot_source${groupBy}`,
      values: [],
      columns: [],
    };
  }
  const pivotDimensions = columns.map((column: unknown) => [...new Map(
    distinctRows.map((row: any) => {
      const raw = row[String(column)];
      const value = raw == null ? 'NULL' : String(raw);
      const pivotValue = raw == null ? NULL_PIVOT_VALUE : String(raw);
      return [value, { raw, pivotValue }] as const;
    }),
  ).entries()]);
  const pivotColumns: Array<{ values: string[]; prefix: string }> = [];
  const addPivotColumn = (displayValues: string[], pivotValues: string[], index: number) => {
    if (index === pivotDimensions.length) { pivotColumns.push({ values: displayValues, prefix: pivotValues.join('_') }); return; }
    for (const [value, dimension] of pivotDimensions[index]) addPivotColumn([...displayValues, value], [...pivotValues, dimension.pivotValue], index + 1);
  };
  addPivotColumn([], [], 0);
  // DuckDB's multi-element PIVOT syntax requires one IN list per ON field;
  // tuple values such as IN (('date', 'Road')) are rejected by the binder.
  const pivotOnColumns = columnSql.map(column => `COALESCE(CAST(${column} AS VARCHAR), ${sqlLiteral(NULL_PIVOT_VALUE)})`);
  const pivotValues = pivotOnColumns.map((column, index) =>
    `${column} IN (${pivotDimensions[index].map(([, dimension]) => sqlLiteral(dimension.pivotValue)).join(', ')})`,
  ).join(', ');
  return {
    statement: `PIVOT (${pivotDateSource(inlineBoundParameters(statement, values), rangedFields, dateRanges)}) ON ${pivotValues} USING ${measureSql.join(', ')}${groupBy}`,
    values: [],
    columns: pivotColumns,
  };
}

function validDateRange(value: unknown): value is string {
  return ['day', 'week', 'month', 'quarter', 'year'].includes(String(value));
}

function pivotDateExpression(field: string, range: string) {
  const date = `TRY_CAST(${quoteIdentifier(field, 'Pivot date field')} AS DATE)`;
  if (range === 'day') return `strftime(${date}, '%Y-%m-%d')`;
  if (range === 'week') return `strftime(date_trunc('week', ${date}), '%G-W%V')`;
  if (range === 'quarter') return `strftime(${date}, '%Y') || '-Q' || CAST(quarter(${date}) AS VARCHAR)`;
  if (range === 'year') return `strftime(${date}, '%Y')`;
  return `strftime(${date}, '%Y-%m')`;
}

function pivotDateSource(statement: string, fields: string[], ranges: Record<string, unknown>) {
  if (!fields.length) return statement;
  const replacements = fields.map(field => `${pivotDateExpression(field, String(ranges[field]))} AS ${quoteIdentifier(field, 'Pivot date field')}`);
  return `SELECT * REPLACE (${replacements.join(', ')}) FROM (${statement}) AS pivot_date_source`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function inlineBoundParameters(statement: string, values: any[]): string {
  let valueIndex = 0;
  let output = '';
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < statement.length; index++) {
    const character = statement[index];
    const next = statement[index + 1];
    if (quote) {
      output += character;
      if (character === quote && next === quote) { output += next; index++; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; output += character; continue; }
    if (character === '?' && valueIndex < values.length) { output += sqlLiteral(values[valueIndex++]); continue; }
    output += character;
  }
  if (valueIndex !== values.length) throw new Error('Datasource parameter count did not match the generated pivot source');
  return output;
}
