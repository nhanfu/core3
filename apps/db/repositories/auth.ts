export class AuthRepository {
  constructor(private readonly db: any) {}

  partition(definition: { table: string; column?: string; strategy: 'range' | 'time' | 'year' | 'list' | 'hash'; interval?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour'; bounds?: Array<{ name: string; from?: string; to?: string }>; partitions?: Array<{ name: string; values: unknown[] }>; buckets?: number; default_partition?: string; replace?: boolean }): Promise<void> {
    return this.db.partition(definition);
  }

  unpartition(table: string): Promise<void> {
    return this.db.unpartition(table);
  }

  private withConnection<T>(fn: (connection: any) => Promise<T> | T): Promise<T> {
    const connection = this.db.connect();
    return Promise.resolve(fn(connection)).finally(() => new Promise<void>((resolve) => connection.close(() => resolve()))) as Promise<T>;
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return this.withConnection((connection) => new Promise((resolve, reject) => {
      connection.all(sql, ...params, (error: Error | null, rows: any[]) => error ? reject(error) : resolve(rows || []));
    }));
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return this.withConnection((connection) => new Promise((resolve, reject) => {
      connection.run(sql, ...params, (error: Error | null) => error ? reject(error) : resolve());
    }));
  }

  async runStatements(sql: string): Promise<void> {
    const noComments = sql.replace(/--[^\n]*/g, '');
    for (const statement of noComments.split(';').map((value) => value.trim()).filter(Boolean)) await this.run(statement);
  }

  async findUserByEmail(email: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT u.*, string_agg(r.name, ',') AS roles_csv,
        COALESCE((SELECT CASE
          WHEN bool_or(sr.view_scope = 'all') THEN 'all'
          WHEN bool_or(sr.view_scope = 'branch') THEN 'branch'
          ELSE 'own' END
          FROM user_roles sur JOIN roles sr ON sr.id = sur.role_id
          WHERE sur.user_id = u.id), 'all') AS view_scope
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE lower(u.email) = lower(?)
       GROUP BY u.id, u.email, u.name, u.password_hash, u.avatar_url,
         u.preferred_lang, u.enabled, u.branch_id, u.department_id,
         u.last_login, u.created_at, u.updated_at`,
      [email.trim()],
    );
    return rows[0] || null;
  }

  async permissions(userId: string): Promise<string[]> {
    const rows = await this.query(
      `SELECT DISTINCT p.permission_key
       FROM permissions p
       JOIN user_roles ur ON ur.role_id = p.role_id
       WHERE ur.user_id = ?`, [userId]);
    return rows.map((row) => String(row.permission_key));
  }

  getPasswordHash(userId: string): Promise<any[]> {
    return this.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  }

  updatePassword(userId: string, passwordHash: string): Promise<void> {
    return this.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, userId]);
  }

  recordLogin(userId: string): Promise<void> {
    return this.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
  }
}
