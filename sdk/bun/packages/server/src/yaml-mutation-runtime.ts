import { bindNamedParams, queryOnConnection, runOnConnection } from '@core3/server/database/sql';
import type { DatabaseDriver } from '@core3/server/database/types';

export type MutationConnection = {
  run(sql: string, ...args: any[]): any;
  all(sql: string, ...args: any[]): any;
};

export type MutationDefinition = {
  operation?: 'insert' | 'update' | 'delete';
  table?: string;
  key_field?: string;
  fields?: string[];
  required?: string[];
  defaults?: Record<string, unknown>;
  /** Empty form values are omitted on insert and become NULL on update. */
  normalize_empty?: string[];
  /** Form checkbox fields are coerced before values reach the database driver. */
  boolean_fields?: string[];
  id_input?: string;
  id_prefix?: string;
  timestamps?: boolean;
  concurrency?: false | { field?: string; input?: string; required?: boolean };
  scope?: { table?: string; field: string; message?: string; message_key?: string };
  message_key?: string;
  guards?: Array<{ type?: 'query' | 'service'; query?: string; service?: string; operation?: string; request?: Record<string, unknown>; compensation?: { service: string; operation: string; request?: Record<string, unknown> }; status?: number; message?: string; code?: string; message_key?: string; message_params?: Record<string, unknown>; assign?: boolean; assign_to?: string; assign_from?: string }>;
  before_steps?: MutationStep[];
  steps?: MutationStep[];
  result?: { query?: string };
  generated?: string[];
  transaction_conflict?: { code: string; message: string };
  transaction_isolation?: Partial<Record<DatabaseDriver, 'serializable'>>;
};

export type MutationStep = {
  query?: string;
  type?: 'query' | 'service';
  service?: string;
  operation?: string;
  request?: Record<string, unknown>;
  assign?: boolean;
  for_each?: { input: string; as?: string; steps: MutationStep[] };
  expect_changed?: boolean;
  status?: number;
  message?: string;
  code?: string;
  message_key?: string;
} | string;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function sameMutationValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if ((left === null || left === undefined || left === '') && (right === null || right === undefined || right === '')) return true;
  if (left !== null && left !== undefined && left !== '' && right !== null && right !== undefined && right !== ''
    && (typeof left === 'number' || typeof right === 'number' || typeof left === 'bigint' || typeof right === 'bigint')) {
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
  constructor(private readonly resolveService?: (name: string) => any, private readonly driver?: DatabaseDriver) {}

  async execute(connection: MutationConnection, definition: MutationDefinition, input: Record<string, any> = {}): Promise<any> {
    const params = { ...input };
    const compensations: Array<{ definition: NonNullable<MutationDefinition['guards']>[number]['compensation']; response: any }> = [];
    if (params.values && typeof params.values === 'object') {
      const values = params.values as Record<string, unknown>;
      for (const field of definition.normalize_empty || []) {
        if (!IDENTIFIER.test(field)) throw { status: 500, message: 'Normalized mutation field is invalid' };
        if (!Object.prototype.hasOwnProperty.call(values, field)) continue;
        const value = values[field];
        if (typeof value === 'string' && !value.trim()) {
          if (definition.operation === 'insert') delete values[field];
          else values[field] = null;
        }
      }
      for (const field of definition.boolean_fields || []) {
        if (!IDENTIFIER.test(field)) throw { status: 500, message: 'Boolean mutation field is invalid' };
        if (!Object.prototype.hasOwnProperty.call(values, field)) continue;
        const value = values[field];
        if (typeof value === 'string') {
          const normalized = value.trim().toLowerCase();
          if (!normalized || ['0', 'false', 'off', 'no'].includes(normalized)) values[field] = false;
          else if (['1', 'true', 'on', 'yes'].includes(normalized)) values[field] = true;
        } else if (typeof value === 'number') {
          values[field] = value !== 0;
        }
      }
      for (const [field, value] of Object.entries(params.values)) {
        if (!Object.prototype.hasOwnProperty.call(params, field)) params[field] = value;
      }
    }
    for (const field of definition.generated || []) {
      if (!IDENTIFIER.test(field)) throw { status: 500, message: 'Generated mutation field is invalid' };
      if (!params[field]) params[field] = crypto.randomUUID();
    }
    const isolation = this.driver ? definition.transaction_isolation?.[this.driver] : undefined;
    if (isolation !== undefined && (isolation !== 'serializable' || this.driver !== 'postgres')) throw { status: 500, message: 'Unsupported mutation transaction isolation' };
    await runOnConnection(connection, isolation === 'serializable' ? 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION');
    try {
      for (const guard of definition.guards || []) {
        if (guard.type === 'service') {
          const response = await this.executeServiceGuard(guard, params);
          if (guard.compensation) compensations.push({ definition: guard.compensation, response });
          if (!response) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected'), ...(guard.code ? { code: guard.code } : {}), ...(guard.message_key ? { message_key: guard.message_key } : {}), ...(guard.message_params ? { message_params: guard.message_params } : {}) };
          if (guard.assign) {
            Object.assign(params, response);
            // Server-form callers keep submitted fields under `values`. Make
            // guard-derived values available to the record mutation as well,
            // so a service/query guard can enrich a local insert or update.
            if (params.values && typeof params.values === 'object') Object.assign(params.values, response);
          }
          if (guard.assign_to) {
            if (!IDENTIFIER.test(String(guard.assign_to))) throw { status: 500, message: 'Service guard assignment field is invalid' };
            const source = String(guard.assign_from || 'id');
            params[String(guard.assign_to)] = response && typeof response === 'object' ? response[source] : response;
            if (params.values && typeof params.values === 'object') params.values[String(guard.assign_to)] = params[String(guard.assign_to)];
          }
          continue;
        }
        const { statement, values } = bindNamedParams(String(guard.query || ''), params);
        const rows = await queryOnConnection(connection, statement, values);
        if (!rows[0]) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected'), ...(guard.code ? { code: guard.code } : {}), ...(guard.message_key ? { message_key: guard.message_key } : {}), ...(guard.message_params ? { message_params: guard.message_params } : {}) };
        if (guard.assign) {
          Object.assign(params, rows[0]);
          // Server-form callers keep submitted fields under `values`; mirror
          // guard-derived values there before the record mutation reads them.
          if (params.values && typeof params.values === 'object') Object.assign(params.values, rows[0]);
        }
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
      for (const compensation of compensations.reverse()) {
        try { await this.executeCompensation(compensation.definition, compensation.response, params); } catch { /* preserve the original domain failure */ }
      }
      const conflict = definition.transaction_conflict;
      const databaseError = error as { code?: string; errno?: string; message?: string };
      const sqlState = databaseError?.code === 'ERR_POSTGRES_SERVER_ERROR' ? databaseError.errno : databaseError?.code;
      if (conflict && (['40001', '40P01'].includes(String(sqlState)) || databaseError?.message === 'TransactionContext Error: Conflict on update!')) {
        throw Object.assign(new Error(conflict.message, { cause: error }), { status: 409, code: conflict.code });
      }
      throw error;
    }
  }

  private async executeServiceGuard(guard: any, params: Record<string, any>): Promise<any> {
    if (!this.resolveService) throw { status: 500, message: 'Service guards are unavailable in this repository' };
    const service = this.resolveService(String(guard.service || ''));
    if (!service || typeof service.call !== 'function') throw { status: 500, message: `Service does not support calls: ${guard.service}` };
    const resolve = (value: unknown): unknown => {
      if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(params, value)) return params[value];
      if (Array.isArray(value)) return value.map(resolve);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, resolve(nested)]));
      return value;
    };
    const request = resolve(guard.request || {}) as Record<string, unknown>;
    return service.call(String(guard.operation || ''), request);
  }

  private async executeCompensation(definition: NonNullable<MutationDefinition['guards']>[number]['compensation'], response: any, params: Record<string, any>): Promise<void> {
    if (!definition || !this.resolveService) return;
    const service = this.resolveService(String(definition.service || ''));
    if (!service || typeof service.call !== 'function') return;
    const request = Object.fromEntries(Object.entries(definition.request || {}).map(([key, value]) => [
      key,
      typeof value === 'string' && value.startsWith('$response.')
        ? response?.[value.slice('$response.'.length)]
        : typeof value === 'string' && Object.prototype.hasOwnProperty.call(params, value) ? params[value] : value,
    ]));
    await service.call(String(definition.operation || ''), request);
  }

  private async executeStep(connection: MutationConnection, step: MutationStep, params: Record<string, any>, item?: unknown): Promise<void> {
    const definition = typeof step === 'string' ? { query: step } : step;
    if (definition.for_each) {
      const values = this.resolve(definition.for_each.input, params, item);
      if (!Array.isArray(values)) throw { status: 500, message: `Mutation iteration input is not an array: ${definition.for_each.input}` };
      for (const value of values) {
        const childParams = { ...params, ...(definition.for_each.as ? { [definition.for_each.as]: value } : {}) };
        for (const childStep of definition.for_each.steps || []) await this.executeStep(connection, childStep, childParams, value);
      }
      return;
    }
    if (definition.type === 'service') {
      const response = await this.executeServiceStep(definition, params, item);
      if (definition.assign && response && typeof response === 'object') Object.assign(params, response);
      return;
    }
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

  private async executeServiceStep(step: any, params: Record<string, any>, item?: unknown): Promise<any> {
    if (!this.resolveService) throw { status: 500, message: 'Service steps are unavailable in this repository' };
    const service = this.resolveService(String(step.service || ''));
    if (!service || typeof service.call !== 'function') throw { status: 500, message: `Service does not support calls: ${step.service}` };
    return service.call(String(step.operation || ''), this.resolveRequest(step.request || {}, params, item));
  }

  private resolveRequest(value: unknown, params: Record<string, any>, item?: unknown): any {
    if (Array.isArray(value)) return value.map((entry) => this.resolveRequest(entry, params, item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, this.resolveRequest(nested, params, item)]));
    if (typeof value === 'string') {
      if (Object.prototype.hasOwnProperty.call(params, value)) return params[value];
      if (value === '$item') return item;
    }
    return value;
  }

  private resolve(path: string, params: Record<string, any>, item?: unknown): unknown {
    if (path === '$item') return item;
    if (path.startsWith('$item.')) return path.slice('$item.'.length).split('.').reduce((current: any, key) => current == null ? undefined : current[key], item);
    return path.split('.').reduce((current: any, key) => current == null ? undefined : current[key], params);
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
      const inputId = definition.id_input ? params[definition.id_input] : undefined;
      const id = String((inputId !== undefined && inputId !== null && inputId !== ''
        ? `${definition.id_prefix || ''}${inputId}`
        : params.id) || crypto.randomUUID());
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
      if (!scoped) throw {
        status: 403,
        message: String(definition.scope.message || 'Record is outside the current view scope'),
        ...(definition.scope.message_key ? { message_key: definition.scope.message_key } : {}),
      };
    }
    if (operation === 'update') {
      if (!requested.length) throw { status: 400, message: 'No fields to update' };
      const keyField = this.identifier(definition.key_field || 'id', 'Mutation key field');
      const currentRows = await queryOnConnection(connection, `SELECT ${requested.join(', ')} FROM ${table} WHERE ${keyField} = ?`, [id]);
      const current = currentRows[0];
      if (!current) throw { status: 404, message: 'Record not found' };
      const changedFields = requested.filter((field) => !sameMutationValue(current[field], values[field]));
      const concurrency = definition.concurrency === false ? undefined : (definition.concurrency || {});
      const versionField = this.identifier(concurrency?.field || 'row_version', 'Concurrency field');
      const versionInput = String(concurrency?.input || 'expected_row_version');
      const expectedVersion = values[versionInput] ?? params[versionInput];
      if (concurrency && (concurrency.required !== false) && (expectedVersion === undefined || expectedVersion === null || expectedVersion === '')) {
        throw { status: 400, message: `${versionInput} is required` };
      }
      if (!changedFields.length && !definition.timestamps) {
        if (concurrency && String(current[versionField]) !== String(expectedVersion)) await this.throwStaleOrMissing(connection, table, id, versionField, keyField);
        return;
      }
      const sets = changedFields.map((field) => `${field} = ?`);
      if (definition.timestamps) sets.push('updated_at = CURRENT_TIMESTAMP');
      if (concurrency) sets.push(`${versionField} = ${versionField} + 1`);
      const where = concurrency ? ` WHERE ${keyField} = ? AND ${versionField} = ?` : ` WHERE ${keyField} = ?`;
      const result = await runOnConnection(connection, `UPDATE ${table} SET ${sets.join(', ')}${where}`, concurrency
        ? [...changedFields.map((field) => values[field]), id, expectedVersion]
        : [...changedFields.map((field) => values[field]), id]);
      if (concurrency) {
        const changed = this.changedRows(result);
        if (changed === 0) await this.throwStaleOrMissing(connection, table, id, versionField, keyField);
        if (changed === undefined) {
          const [current] = await queryOnConnection(connection, `SELECT ${keyField}, ${versionField} FROM ${table} WHERE ${keyField} = ?`, [id]);
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
    const keyField = this.identifier(definition.key_field || 'id', 'Mutation key field');
    const where = concurrency ? ` WHERE ${keyField} = ? AND ${versionField} = ?` : ` WHERE ${keyField} = ?`;
    const result = await runOnConnection(connection, `DELETE FROM ${table}${where}`, concurrency ? [id, expectedVersion] : [id]);
    if (concurrency && this.changedRows(result) === 0) await this.throwStaleOrMissing(connection, table, id, versionField, keyField);
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

  private async throwStaleOrMissing(connection: MutationConnection, table: string, id: unknown, versionField: string, keyField = 'id'): Promise<never> {
    const [current] = await queryOnConnection(connection, `SELECT ${keyField}, ${versionField} FROM ${table} WHERE ${keyField} = ?`, [id]);
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
