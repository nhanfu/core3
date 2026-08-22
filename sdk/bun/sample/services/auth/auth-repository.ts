import { bindNamedParams, queryOnConnection, runOnConnection, splitSQL } from '@core3/server/database/sql';
import type { DatabaseDriver } from '@core3/server/database/types';

export class AuthRepository {
  constructor(private readonly db: any, private readonly queries: Record<string, string>) {}

  get driver(): DatabaseDriver | undefined { return this.db.driver; }

  partition(definition: any): Promise<void> { return this.db.partition(definition); }
  unpartition(table: string): Promise<void> { return this.db.unpartition(table); }

  private withConnection<T>(fn: (connection: any) => Promise<T> | T): Promise<T> {
    const connection = this.db.connect();
    return Promise.resolve(fn(connection)).finally(() => new Promise<void>((resolve) => connection.close(() => resolve()))) as Promise<T>;
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return this.withConnection((connection) => queryOnConnection(connection, sql, params));
  }

  run(sql: string, params: any[] = []): Promise<any> {
    return this.withConnection((connection) => runOnConnection(connection, sql, params));
  }

  async runStatements(sql: string): Promise<void> {
    for (const statement of splitSQL(sql)) await this.run(statement);
  }

  private async execute(name: string, params: Record<string, unknown>): Promise<any[]> {
    const query = this.queries[name];
    if (!query) throw new Error(`Auth data query is not declared: ${name}`);
    const bound = bindNamedParams(query, params);
    return this.query(bound.statement, bound.values);
  }

  async findUserByEmail(email: string): Promise<any | null> {
    const rows = await this.execute('find_user_by_email', { email: email.trim() });
    return rows[0] || null;
  }

  async lookupUser(email: string): Promise<any | null> {
    const rows = await this.execute('lookup_user', { email: email.trim() });
    return rows[0] || null;
  }

  async permissions(userId: string): Promise<string[]> {
    const rows = await this.execute('permissions', { user_id: userId });
    return rows.map((row) => String(row.permission_key));
  }

  getPasswordHash(userId: string): Promise<any[]> {
    return this.execute('password_hash', { user_id: userId });
  }

  updatePassword(userId: string, passwordHash: string): Promise<void> {
    return this.execute('update_password', { user_id: userId, password_hash: passwordHash }).then(() => undefined);
  }

  recordLogin(userId: string): Promise<void> {
    return this.execute('record_login', { user_id: userId }).then(() => undefined);
  }

  async profile(userId: string): Promise<any | null> {
    const [row] = await this.execute('profile', { user_id: userId });
    return row || null;
  }

  async updateProfile(userId: string, fields: Record<string, unknown>): Promise<void> {
    const params = { user_id: userId, ...fields };
    const query = this.queries.update_profile;
    if (!query) throw new Error('Auth data query is not declared: update_profile');
    const bound = bindNamedParams(query, params);
    const result = await this.run(bound.statement, bound.values);
    const changed = typeof result?.rowsChanged === 'number' ? result.rowsChanged
      : typeof result?.affectedRows === 'number' ? result.affectedRows
      : typeof result?.rowCount === 'number' ? result.rowCount
      : Array.isArray(result?.rowsAffected) ? Number(result.rowsAffected[0] || 0)
      : typeof result?.rowsAffected === 'number' ? result.rowsAffected
      : typeof result?.count === 'number' ? result.count : undefined;
    if (changed === undefined) {
      const current = await this.profile(userId);
      if (!current) throw { status: 404, message: 'User not found' };
      if (String(current.row_version) === String(params.expected_row_version)) {
        throw { status: 409, code: 'STALE_RECORD', message_key: 'errors.stale_record', message: 'Profile was changed by another user. Reload it before saving.' };
      }
      return;
    }
    if (changed === 0) {
      const current = await this.profile(userId);
      if (!current) throw { status: 404, message: 'User not found' };
      throw { status: 409, code: 'STALE_RECORD', message_key: 'errors.stale_record', message: 'Profile was changed by another user. Reload it before saving.' };
    }
  }

  userSummariesByIds(userIds: string[]): Promise<any[]> {
    return this.execute('user_summaries_by_ids', { user_ids: userIds });
  }

  userSummariesByEmails(emails: string[]): Promise<any[]> {
    return this.execute('user_summaries_by_emails', { emails: emails.map((email) => email.toLowerCase()) });
  }

  userSearch(query: string | null, branchId: string | null, viewScope: string, limit: number): Promise<any[]> {
    return this.execute('user_search', { query: query || null, branch_id: branchId, view_scope: viewScope, limit }).then(rows => rows.slice(0, Math.max(1, Math.min(limit || 100, 100))));
  }

  userValidate(userId: string, branchId: string | null, viewScope: string): Promise<any | null> {
    return this.execute('user_validate', { user_id: userId, branch_id: branchId, view_scope: viewScope }).then(rows => rows[0] || null);
  }

  usersManage(query: string | null, limit = 100): Promise<any[]> {
    return this.execute('users_manage', { query: query || null }).then(rows => rows.slice(0, Math.max(1, Math.min(limit || 100, 500))));
  }

  companiesForUser(userId: string): Promise<any[]> {
    return this.execute('companies_for_user', { user_id: userId });
  }

  companyForUser(userId: string, companyId: string): Promise<any | null> {
    return this.execute('company_for_user', { user_id: userId, company_id: companyId }).then(rows => rows[0] || null);
  }

  async setCurrentCompany(userId: string, companyId: string): Promise<any | null> {
    const rows = await this.execute('company_for_user', { user_id: userId, company_id: companyId });
    if (!rows[0]) return null;
    await this.execute('set_current_company', { user_id: userId, company_id: companyId });
    return rows[0];
  }

  rolesManage(query: string | null = null): Promise<any[]> {
    return this.execute('roles_manage', { query: query || null });
  }

  async updateManagedUser(fields: Record<string, unknown>): Promise<any> {
    await this.execute('update_managed_user', fields);
    if (Array.isArray(fields.role_ids)) await this.replaceUserRoles(String(fields.id), fields.role_ids.map(String));
    return (await this.usersManage(String(fields.id), 1))[0] || null;
  }

  private async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.withConnection(async (connection) => {
      await runOnConnection(connection, 'BEGIN TRANSACTION');
      try {
        await runOnConnection(connection, 'DELETE FROM user_roles WHERE user_id = ?', [userId]);
        for (const roleId of [...new Set(roleIds)].filter(Boolean)) {
          await runOnConnection(connection, 'INSERT INTO user_roles(user_id, role_id) VALUES (?, ?)', [userId, roleId]);
        }
        await runOnConnection(connection, 'COMMIT');
      } catch (error) {
        await runOnConnection(connection, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async updateManagedRole(fields: Record<string, unknown>): Promise<any> {
    await this.execute('update_managed_role', fields);
    if (Array.isArray(fields.permissions)) await this.replaceRolePermissions(String(fields.id), fields.permissions.map(String));
    return (await this.rolesManage(String(fields.id)))[0] || null;
  }

  async rolePermissions(roleId: string): Promise<string[]> {
    return (await this.execute('role_permissions', { role_id: roleId })).map((row) => String(row.permission_key));
  }

  private async replaceRolePermissions(roleId: string, permissionKeys: string[]): Promise<void> {
    await this.withConnection(async (connection) => {
      await runOnConnection(connection, 'BEGIN TRANSACTION');
      try {
        await runOnConnection(connection, 'DELETE FROM permissions WHERE role_id = ?', [roleId]);
        for (const permissionKey of [...new Set(permissionKeys)].filter(Boolean)) {
          await runOnConnection(connection, 'INSERT INTO permissions(id, role_id, permission_key) VALUES (?, ?, ?)', [crypto.randomUUID(), roleId, permissionKey]);
        }
        await runOnConnection(connection, 'COMMIT');
      } catch (error) {
        await runOnConnection(connection, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }
}
