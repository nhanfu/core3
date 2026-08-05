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
    source: { id?: string; query: string; single?: boolean },
    params: Record<string, any> = {},
    skip = 0,
    top = 25,
    facetField?: string,
    sort?: { field?: unknown; direction?: unknown },
  ): Promise<any> {
    const { statement, values } = bindNamedParams(source.query, params);
    const diagnostics = {
      sourceId: source.id || '<anonymous>',
      single: source.single === true,
      params: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, redactQueryValue(key, value)])),
      statement,
      boundValueTypes: values.map(value => value === null ? 'null' : typeof value),
      boundValueCount: values.length,
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

    const [count] = await runQuery('count', `SELECT COUNT(*) AS n FROM (${statement}) AS source_rows`, values);
    const pageSize = Math.max(1, Math.min(Number(top) || 25, 100));
    const offset = Math.max(0, Number(skip) || 0);
    const sortField = typeof sort?.field === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(sort.field)
      ? sort.field
      : null;
    const sortDirection = sort?.direction === 'desc' ? 'DESC' : 'ASC';
    const sortClause = sortField ? ` ORDER BY source_rows."${sortField}" ${sortDirection} NULLS LAST` : '';
    const rows = await runQuery('rows',
      `SELECT * FROM (${statement}) AS source_rows${sortClause} LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
    const total = Number(count?.n || 0);
    const meta: any = { total, page: Math.floor(offset / pageSize) + 1, pageSize, pages: Math.ceil(total / pageSize) };
    if (facetField && /^[A-Za-z_][A-Za-z0-9_]*$/.test(facetField)) {
      try {
        const facetRows = await this.query(

          `SELECT CAST(source_rows."${facetField}" AS VARCHAR) AS value, COUNT(*) AS n FROM (${statement}) AS source_rows GROUP BY source_rows."${facetField}"`,
          values,
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

