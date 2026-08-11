import { bindNamedParams, queryOnConnection, runOnConnection } from './tms-shared.ts';

export class DuckDbRepositoryCore {
db: any;

  constructor(db: any) {
    this.db = db;
  }

  async withConnection<T>(fn: (conn: any) => Promise<T> | T): Promise<T> {
    const conn = this.db.connect();
    try {
      return await fn(conn);
    } finally {
      await new Promise<void>((resolve) => conn.close(() => resolve()));
    }
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return this.withConnection((conn) => runOnConnection(conn, sql, params));
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return this.withConnection((conn) => queryOnConnection(conn, sql, params));
  }

  async executeMutation(definition: any, input: Record<string, any> = {}): Promise<any> {
    const params = { ...input };
    if (params.values && typeof params.values === 'object') Object.assign(params, params.values);
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        for (const guard of definition.guards || []) {
          const { statement, values } = bindNamedParams(String(guard.query || ''), params);
          const rows = await queryOnConnection(conn, statement, values);
          if (!rows[0]) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected') };
          if (guard.assign) Object.assign(params, rows[0]);
        }
        for (const step of definition.before_steps || []) await this.executeMutationStep(conn, step, params);
        if (definition.operation) await this.executeDeclarativeRecordMutation(conn, definition, params);
        for (const step of definition.steps || []) {
          await this.executeMutationStep(conn, step, params);
        }
        let result: any = params;
        if (definition.result?.query) {
          const { statement, values } = bindNamedParams(String(definition.result.query), params);
          const [row] = await queryOnConnection(conn, statement, values);
          result = row || {};
        }
        await runOnConnection(conn, 'COMMIT');
        return result;
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  private async executeMutationStep(conn: any, step: any, params: Record<string, any>): Promise<void> {
    const { statement, values } = bindNamedParams(String(step.query || ''), params);
    if (step.assign) {
      const [row] = await queryOnConnection(conn, statement, values);
      if (row) Object.assign(params, row);
    } else await runOnConnection(conn, statement, values);
  }

  private async executeDeclarativeRecordMutation(conn: any, definition: any, params: Record<string, any>): Promise<void> {
    const table = String(definition.table || '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw { status: 500, message: 'Mutation table is invalid' };
    const operation = String(definition.operation);
    if (!['insert', 'update', 'delete'].includes(operation)) throw { status: 500, message: `Unsupported mutation operation: ${operation}` };
    const fields = Array.isArray(definition.fields) ? definition.fields.map(String) : [];
    const values = params.values && typeof params.values === 'object' ? params.values : params;
    const requested = fields.filter((field) => Object.prototype.hasOwnProperty.call(values, field));
    for (const field of Array.isArray(definition.required) ? definition.required.map(String) : []) {
      const value = values[field];
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) throw { status: 400, message: `${field} is required` };
    }
    if (operation === 'insert') {
      const id = String(params.id || crypto.randomUUID());
      params.id = id;
      const insertFields = [...requested];
      const insertValues = insertFields.map((field) => values[field]);
      for (const [field, value] of Object.entries(definition.defaults || {})) {
        if (!insertFields.includes(field)) { insertFields.push(field); insertValues.push(value); }
      }
      if (definition.scope?.field && params.view_scope !== 'all' && !insertFields.includes(String(definition.scope.field))) {
        insertFields.push(String(definition.scope.field));
        insertValues.push(params.current_branch_id || null);
      }
      const columns = ['id', ...insertFields];
      await runOnConnection(conn, `INSERT INTO ${table}(${columns.join(', ')}) VALUES(${columns.map(() => '?').join(', ')})`, [id, ...insertValues]);
      return;
    }
    const id = params.id;
    if (id === undefined || id === null || id === '') throw { status: 400, message: 'id required' };
    if (definition.scope?.field) {
      const scopeField = String(definition.scope.field);
      const bound = bindNamedParams(`SELECT id FROM ${table} WHERE id = :id AND (:view_scope = 'all' OR ${scopeField} = :current_branch_id)`, { ...params, id });
      const [scoped] = await queryOnConnection(conn, bound.statement, bound.values);
      if (!scoped) throw { status: 403, message: String(definition.scope.message || 'Record is outside the current view scope') };
    }
    if (operation === 'update') {
      if (!requested.length) throw { status: 400, message: 'No fields to update' };
      const sets = requested.map((field) => `${field} = ?`);
      if (definition.timestamps) sets.push('updated_at = CURRENT_TIMESTAMP');
      await runOnConnection(conn, `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, [...requested.map((field) => values[field]), id]);
      return;
    }
    await runOnConnection(conn, `DELETE FROM ${table} WHERE id = ?`, [id]);
  }
}
