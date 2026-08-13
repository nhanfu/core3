import { bindNamedParams, queryOnConnection, runOnConnection } from '@core3/server/database/sql';

export type MutationConnection = {
  run(sql: string, ...args: any[]): void;
  all(sql: string, ...args: any[]): void;
};

export type MutationDefinition = {
  operation?: 'insert' | 'update' | 'delete';
  table?: string;
  fields?: string[];
  required?: string[];
  defaults?: Record<string, unknown>;
  timestamps?: boolean;
  scope?: { table?: string; field: string; message?: string };
  guards?: Array<{ query: string; status?: number; message?: string; assign?: boolean }>;
  before_steps?: MutationStep[];
  steps?: MutationStep[];
  result?: { query?: string };
  generated?: string[];
};

export type MutationStep = { query: string; assign?: boolean } | string;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class YamlMutationRuntime {
  async execute(connection: MutationConnection, definition: MutationDefinition, input: Record<string, any> = {}): Promise<any> {
    const params = { ...input };
    if (params.values && typeof params.values === 'object') Object.assign(params, params.values);
    for (const field of definition.generated || []) {
      if (!IDENTIFIER.test(field)) throw { status: 500, message: 'Generated mutation field is invalid' };
      if (!params[field]) params[field] = crypto.randomUUID();
    }
    await runOnConnection(connection, 'BEGIN TRANSACTION');
    try {
      for (const guard of definition.guards || []) {
        const { statement, values } = bindNamedParams(String(guard.query || ''), params);
        const rows = await queryOnConnection(connection, statement, values);
        if (!rows[0]) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected') };
        if (guard.assign) Object.assign(params, rows[0]);
      }
      for (const step of definition.before_steps || []) await this.executeStep(connection, step, params);
      if (definition.operation) await this.executeRecordMutation(connection, definition, params);
      for (const step of definition.steps || []) await this.executeStep(connection, step, params);
      let result: any = params;
      if (definition.result?.query) {
        const { statement, values } = bindNamedParams(definition.result.query, params);
        const [row] = await queryOnConnection(connection, statement, values);
        result = row || {};
      }
      await runOnConnection(connection, 'COMMIT');
      return result;
    } catch (error) {
      await runOnConnection(connection, 'ROLLBACK').catch(() => {});
      throw error;
    }
  }

  private async executeStep(connection: MutationConnection, step: MutationStep, params: Record<string, any>): Promise<void> {
    const definition = typeof step === 'string' ? { query: step } : step;
    const { statement, values } = bindNamedParams(String(definition.query || ''), params);
    if (definition.assign) {
      const [row] = await queryOnConnection(connection, statement, values);
      if (row) Object.assign(params, row);
    } else await runOnConnection(connection, statement, values);
  }

  private async executeRecordMutation(connection: MutationConnection, definition: MutationDefinition, params: Record<string, any>): Promise<void> {
    const table = this.identifier(definition.table, 'Mutation table');
    const operation = definition.operation;
    if (!operation || !['insert', 'update', 'delete'].includes(operation)) throw { status: 500, message: `Unsupported mutation operation: ${operation}` };
    const fields = (definition.fields || []).map((field) => this.identifier(field, 'Mutation field'));
    const values = params.values && typeof params.values === 'object' ? params.values : params;
    const requested = fields.filter((field) => Object.prototype.hasOwnProperty.call(values, field));
    for (const field of definition.required || []) {
      const value = values[field];
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) throw { status: 400, message: `${field} is required` };
    }
    if (operation === 'insert') {
      const id = String(params.id || crypto.randomUUID());
      params.id = id;
      const insertFields = [...requested];
      const insertValues = insertFields.map((field) => values[field]);
      for (const [field, value] of Object.entries(definition.defaults || {})) {
        const safeField = this.identifier(field, 'Mutation default field');
        if (!insertFields.includes(safeField)) { insertFields.push(safeField); insertValues.push(value); }
      }
      if (definition.scope?.field && params.view_scope !== 'all' && !insertFields.includes(definition.scope.field)) {
        insertFields.push(this.identifier(definition.scope.field, 'Mutation scope field'));
        insertValues.push(params.current_branch_id || null);
      }
      const columns = ['id', ...insertFields];
      await runOnConnection(connection, `INSERT INTO ${table}(${columns.join(', ')}) VALUES(${columns.map(() => '?').join(', ')})`, [id, ...insertValues]);
      return;
    }
    const id = params.id;
    if (id === undefined || id === null || id === '') throw { status: 400, message: 'id required' };
    if (definition.scope?.field) {
      const scopeTable = this.identifier(definition.scope.table || table, 'Mutation scope table');
      const scopeField = this.identifier(definition.scope.field, 'Mutation scope field');
      const bound = bindNamedParams(`SELECT id FROM ${scopeTable} WHERE id = :id AND (:view_scope = 'all' OR ${scopeField} = :current_branch_id)`, { ...params, id });
      const [scoped] = await queryOnConnection(connection, bound.statement, bound.values);
      if (!scoped) throw { status: 403, message: String(definition.scope.message || 'Record is outside the current view scope') };
    }
    if (operation === 'update') {
      if (!requested.length) throw { status: 400, message: 'No fields to update' };
      const sets = requested.map((field) => `${field} = ?`);
      if (definition.timestamps) sets.push('updated_at = CURRENT_TIMESTAMP');
      await runOnConnection(connection, `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, [...requested.map((field) => values[field]), id]);
      return;
    }
    await runOnConnection(connection, `DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  private identifier(value: unknown, label: string): string {
    const identifier = String(value || '');
    if (!IDENTIFIER.test(identifier)) throw { status: 500, message: `${label} is invalid` };
    return identifier;
  }
}
