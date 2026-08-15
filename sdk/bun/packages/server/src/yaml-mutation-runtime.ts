import { bindNamedParams, queryOnConnection, runOnConnection } from '@core3/server/database/sql';

export type MutationConnection = {
  run(sql: string, ...args: any[]): any;
  all(sql: string, ...args: any[]): any;
};

export type MutationDefinition = {
  operation?: 'insert' | 'update' | 'delete';
  table?: string;
  fields?: string[];
  required?: string[];
  defaults?: Record<string, unknown>;
  timestamps?: boolean;
  concurrency?: false | { field?: string; input?: string; required?: boolean };
  scope?: { table?: string; field: string; message?: string };
  message_key?: string;
  guards?: Array<{ type?: 'query' | 'service'; query?: string; service?: string; operation?: string; request?: Record<string, unknown>; status?: number; message?: string; code?: string; assign?: boolean }>;
  before_steps?: MutationStep[];
  steps?: MutationStep[];
  result?: { query?: string };
  generated?: string[];
};

export type MutationStep = { query: string; assign?: boolean; expect_changed?: boolean; status?: number; message?: string; code?: string; message_key?: string } | string;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function sameMutationValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if ((left === null || left === undefined || left === '') && (right === null || right === undefined || right === '')) return true;
  if (typeof left === 'number' || typeof right === 'number' || typeof left === 'bigint' || typeof right === 'bigint') {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber === rightNumber;
  }
  const leftText = left instanceof Date ? left.toISOString() : String(left ?? '');
  const rightText = right instanceof Date ? right.toISOString() : String(right ?? '');
  if (leftText === rightText) return true;
  return /^\d{4}-\d{2}-\d{2}T/.test(leftText) && leftText.slice(0, 10) === rightText;
}

export class YamlMutationRuntime {
  constructor(private readonly resolveService?: (name: string) => any) {}

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
        if (guard.type === 'service') {
          const response = await this.executeServiceGuard(guard, params);
          if (!response) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected'), ...(guard.code ? { code: guard.code } : {}) };
          if (guard.assign) Object.assign(params, response);
          continue;
        }
        const { statement, values } = bindNamedParams(String(guard.query || ''), params);
        const rows = await queryOnConnection(connection, statement, values);
        if (!rows[0]) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected'), ...(guard.code ? { code: guard.code } : {}) };
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

  private async executeServiceGuard(guard: any, params: Record<string, any>): Promise<any> {
    if (!this.resolveService) throw { status: 500, message: 'Service guards are unavailable in this repository' };
    const service = this.resolveService(String(guard.service || ''));
    if (!service || typeof service.call !== 'function') throw { status: 500, message: `Service does not support calls: ${guard.service}` };
    const request = Object.fromEntries(Object.entries(guard.request || {}).map(([key, value]) => [
      key,
      typeof value === 'string' && Object.prototype.hasOwnProperty.call(params, value) ? params[value] : value,
    ]));
    return service.call(String(guard.operation || ''), request);
  }

  private async executeStep(connection: MutationConnection, step: MutationStep, params: Record<string, any>): Promise<void> {
    const definition = typeof step === 'string' ? { query: step } : step;
    const { statement, values } = bindNamedParams(String(definition.query || ''), params);
    if (definition.assign) {
      const [row] = await queryOnConnection(connection, statement, values);
      if (row) Object.assign(params, row);
    } else {
      const result = await runOnConnection(connection, statement, values);
      if (definition.expect_changed && this.changedRows(result) === 0) {
        throw {
          status: Number(definition.status || 409),
          message: String(definition.message || 'Record was changed by another user. Reload it before saving.'),
          ...(definition.code ? { code: definition.code } : { code: 'STALE_RECORD' }),
          message_key: definition.message_key || 'errors.stale_record',
        };
      }
    }
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
      const currentRows = await queryOnConnection(connection, `SELECT ${requested.join(', ')} FROM ${table} WHERE id = ?`, [id]);
      const current = currentRows[0];
      if (!current) throw { status: 404, message: 'Record not found' };
      const changedFields = requested.filter((field) => !sameMutationValue(current[field], values[field]));
      const sets = changedFields.map((field) => `${field} = ?`);
      if (definition.timestamps) sets.push('updated_at = CURRENT_TIMESTAMP');
      const concurrency = definition.concurrency === false ? undefined : (definition.concurrency || {});
      const versionField = this.identifier(concurrency?.field || 'row_version', 'Concurrency field');
      const versionInput = String(concurrency?.input || 'expected_row_version');
      const expectedVersion = values[versionInput] ?? params[versionInput];
      if (concurrency && (concurrency.required !== false) && (expectedVersion === undefined || expectedVersion === null || expectedVersion === '')) {
        throw { status: 400, message: `${versionInput} is required` };
      }
      if (concurrency) sets.push(`${versionField} = ${versionField} + 1`);
      const where = concurrency ? ` WHERE id = ? AND ${versionField} = ?` : ' WHERE id = ?';
      const result = await runOnConnection(connection, `UPDATE ${table} SET ${sets.join(', ')}${where}`, concurrency
        ? [...changedFields.map((field) => values[field]), id, expectedVersion]
        : [...changedFields.map((field) => values[field]), id]);
      if (concurrency) {
        const changed = this.changedRows(result);
        if (changed === 0) await this.throwStaleOrMissing(connection, table, id, versionField);
        if (changed === undefined) {
          const [current] = await queryOnConnection(connection, `SELECT id, ${versionField} FROM ${table} WHERE id = ?`, [id]);
          if (!current) throw { status: 404, message: 'Record not found' };
          if (String(current[versionField]) === String(expectedVersion)) await this.throwStaleOrMissing(connection, table, id, versionField);
        }
      }
      return;
    }
    const concurrency = definition.concurrency === false ? undefined : (definition.concurrency || {});
    const versionField = this.identifier(concurrency?.field || 'row_version', 'Concurrency field');
    const versionInput = String(concurrency?.input || 'expected_row_version');
    const expectedVersion = values[versionInput] ?? params[versionInput];
    if (concurrency && (concurrency.required !== false) && (expectedVersion === undefined || expectedVersion === null || expectedVersion === '')) {
      throw { status: 400, message: `${versionInput} is required` };
    }
    const where = concurrency ? ` WHERE id = ? AND ${versionField} = ?` : ' WHERE id = ?';
    const result = await runOnConnection(connection, `DELETE FROM ${table}${where}`, concurrency ? [id, expectedVersion] : [id]);
    if (concurrency && this.changedRows(result) === 0) await this.throwStaleOrMissing(connection, table, id, versionField);
  }

  private changedRows(result: any): number | undefined {
    if (typeof result?.rowsChanged === 'number') return result.rowsChanged;
    if (typeof result?.affectedRows === 'number') return result.affectedRows;
    if (typeof result?.rowCount === 'number' && result?.rowsAffected === undefined) return result.rowCount;
    if (Array.isArray(result?.rowsAffected)) return Number(result.rowsAffected[0] || 0);
    if (typeof result?.rowsAffected === 'number') return result.rowsAffected;
    if (typeof result?.count === 'number') return result.count;
    return undefined;
  }

  private async throwStaleOrMissing(connection: MutationConnection, table: string, id: unknown, versionField: string): Promise<never> {
    const [current] = await queryOnConnection(connection, `SELECT id, ${versionField} FROM ${table} WHERE id = ?`, [id]);
    if (!current) throw { status: 404, message: 'Record not found' };
    throw {
      status: 409,
      code: 'STALE_RECORD',
      message: 'Record was changed by another user. Reload it before saving.',
      message_key: 'errors.stale_record',
    };
  }

  private identifier(value: unknown, label: string): string {
    const identifier = String(value || '');
    if (!IDENTIFIER.test(identifier)) throw { status: 500, message: `${label} is invalid` };
    return identifier;
  }
}
