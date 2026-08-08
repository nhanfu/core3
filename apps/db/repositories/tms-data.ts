import {
  type Change,
  bindNamedParams,
  describeQueryError,
  normalizeContactValues,
  normalizeLineValues,
  queryOnConnection,
  redactQueryValue,
  runOnConnection,
  splitSQL,
} from './tms-shared.ts';

export const dataMethods = {
  querySource: async function(this: any,
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
        console.error('[tms][datasource-query] failed', {
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
    const pageSize = Math.max(1, Math.min(Number(top) || 25, 100));
    const offset = Math.max(0, Number(skip) || 0);
    const sortField = typeof sort?.field === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(sort.field)
      ? sort.field
      : null;
    const sortDirection = sort?.direction === 'desc' ? 'DESC' : 'ASC';
    const sortClause = sortField ? ` ORDER BY source_rows."${sortField}" ${sortDirection} NULLS LAST` : '';
    const rows = await runQuery('rows',
      `SELECT * FROM (${pivotStatement}) AS source_rows${sortClause} LIMIT ? OFFSET ?`,
      [...queryValues, pageSize, offset]
    );
    const total = Number(count?.n || 0);
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
  },

  createRecord: async function(this: any,table: string, changes: Change[]): Promise<any> {
    const newId = crypto.randomUUID();
    const cols = ['id', ...changes.map((c) => c.field)].join(', ');
    const vals = [newId, ...changes.map((c) => c.value)];
    await this.run(
      `INSERT INTO ${table}(${cols}) VALUES(${vals.map(() => '?').join(', ')})`,
      vals
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [newId]);
    return rows[0] || null;
  },

  updateRecord: async function(this: any,table: string, id: any, changes: Change[], timestamps: boolean): Promise<any> {
    if (table === 'orders') {
      return this.updateOrderRecord(id, changes, timestamps);
    }
    const sets = changes.map((c) => `${c.field} = ?`).join(', ');
    const tsClause = timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
    await this.run(
      `UPDATE ${table} SET ${sets}${tsClause} WHERE id = ?`,
      [...changes.map((c) => c.value), id]
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  updateOrderRecord: async function(this: any,id: any, changes: Change[], timestamps: boolean): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const lines = await queryOnConnection(
          conn,
          'SELECT id, order_id, sequence, description, quantity, unit, unit_price, tax_rate, line_total, created_at, updated_at FROM order_lines WHERE order_id = ? ORDER BY sequence, id',
          [id],
        );
        const [workflowState] = await queryOnConnection(
          conn,
          'SELECT order_id, status, updated_at FROM order_workflow_states WHERE order_id = ?',
          [id],
        );
        if (lines.length) await runOnConnection(conn, 'DELETE FROM order_lines WHERE order_id = ?', [id]);
        if (workflowState) await runOnConnection(conn, 'DELETE FROM order_workflow_states WHERE order_id = ?', [id]);

        const sets = changes.map((change) => `${change.field} = ?`).join(', ');
        const values = [...changes.map((change) => change.value), ...(timestamps ? [new Date()] : []), id];
        await runOnConnection(
          conn,
          `UPDATE orders SET ${sets}${timestamps ? ', updated_at = ?' : ''} WHERE id = ?`,
          values,
        );

        if (workflowState) {
          await runOnConnection(
            conn,
            'INSERT INTO order_workflow_states(order_id, status, updated_at) VALUES(?,?,?)',
            [workflowState.order_id, workflowState.status, workflowState.updated_at],
          );
        }
        for (const line of lines) {
          await runOnConnection(
            conn,
            `INSERT INTO order_lines(
              id, order_id, sequence, description, quantity, unit, unit_price,
              tax_rate, line_total, created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
            [line.id, line.order_id, line.sequence, line.description, line.quantity, line.unit, line.unit_price, line.tax_rate, line.line_total, line.created_at, line.updated_at],
          );
        }
        const [updated] = await queryOnConnection(conn, 'SELECT * FROM orders WHERE id = ?', [id]);
        await runOnConnection(conn, 'COMMIT');
        return updated || null;
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },

  deleteRecord: async function(this: any,table: string, id: any): Promise<void> {
    if (
      table !== 'orders'
      && table !== 'quotes'
      && table !== 'accounting_entries'
      && table !== 'customers'
      && table !== 'partners'
      && table !== 'system_configs'
    ) {
      await this.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return;
    }
    await this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
      await runOnConnection(
        conn,
          `DELETE FROM ${
            table === 'orders'
              ? 'order_lines'
              : table === 'quotes'
                ? 'quote_lines'
                : table === 'accounting_entries'
                  ? 'accounting_entry_lines'
                  : table === 'customers'
                    ? 'customer_contacts'
                    : table === 'partners'
                      ? 'partner_contacts'
                      : 'approval_flow_steps'
          }
           WHERE ${
             table === 'orders'
               ? 'order_id'
               : table === 'quotes'
                 ? 'quote_id'
                 : table === 'accounting_entries'
                   ? 'entry_id'
                 : table === 'customers'
                     ? 'customer_id'
                     : table === 'partners'
                       ? 'partner_id'
                       : 'flow_id'
           } = ?`,
        [id],
      );
        if (table === 'orders') {
          await runOnConnection(conn, 'DELETE FROM order_workflow_states WHERE order_id = ?', [id]);
        }
        if (table === 'system_configs') {
          await runOnConnection(conn, 'DELETE FROM print_template_blocks WHERE template_id = ?', [id]);
        }
        await runOnConnection(conn, `DELETE FROM ${table} WHERE id = ?`, [id]);
        await runOnConnection(conn, 'COMMIT');
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },
};

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
  const measures = Array.isArray(request.measures) ? request.measures : [{ field: request.measureField, aggregate: request.aggregate || 'sum', label: request.measureLabel }];
  if (!measures.length) throw Object.assign(new Error('Pivot requires at least one measure'), { status: 400 });
  const checkField = (field: unknown, label: string) => {
    const name = String(field || '');
    if (!allowed.has(name)) throw Object.assign(new Error(`${label} is not declared as pivotable`), { status: 400 });
    return quoteIdentifier(name, label);
  };
  const rowSql = rows.map((field: unknown) => checkField(field, 'Pivot row field'));
  const columnSql = columns.map((field: unknown) => checkField(field, 'Pivot column field'));
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
    return { statement: `SELECT ${[...rowSql, ...measureSql].join(', ')} FROM (${statement}) AS pivot_source${groupBy}`, values };
  }
  const distinctRows = await repository.query(
    `SELECT DISTINCT ${columnSql.join(', ')} FROM (${statement}) AS pivot_values`,
    values,
  );
  if (!distinctRows.length) {
    // DuckDB treats IN (NULL) as an implicit, data-extracted pivot. That form
    // is rejected when the source query contains bound parameters, which is
    // common after filters remove every pivot column value.
    return {
      statement: `SELECT ${[...rowSql, ...measureSql].join(', ')} FROM (${inlineBoundParameters(statement, values)}) AS pivot_source${groupBy}`,
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
    statement: `PIVOT (${inlineBoundParameters(statement, values)}) ON ${pivotValues} USING ${measureSql.join(', ')}${groupBy}`,
    values: [],
    columns: pivotColumns,
  };
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
