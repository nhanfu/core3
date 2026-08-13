import { bindNamedParams, queryOnConnection, runOnConnection, splitSQL } from '@core3/server/database/sql';

export class AuthRepository {
  constructor(private readonly db: any, private readonly queries: Record<string, string>) {}

  partition(definition: any): Promise<void> { return this.db.partition(definition); }
  unpartition(table: string): Promise<void> { return this.db.unpartition(table); }

  private withConnection<T>(fn: (connection: any) => Promise<T> | T): Promise<T> {
    const connection = this.db.connect();
    return Promise.resolve(fn(connection)).finally(() => new Promise<void>((resolve) => connection.close(() => resolve()))) as Promise<T>;
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return this.withConnection((connection) => queryOnConnection(connection, sql, params));
  }

  run(sql: string, params: any[] = []): Promise<void> {
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

  updateProfile(userId: string, fields: Record<string, unknown>): Promise<void> {
    return this.execute('update_profile', { user_id: userId, ...fields }).then(() => undefined);
  }
}
