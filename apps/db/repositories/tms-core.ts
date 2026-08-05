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
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        for (const guard of definition.guards || []) {
          const { statement, values } = bindNamedParams(String(guard.query || ''), params);
          const rows = await queryOnConnection(conn, statement, values);
          if (!rows[0]) throw { status: Number(guard.status || 400), message: String(guard.message || 'Mutation rejected') };
          if (guard.assign) Object.assign(params, rows[0]);
        }
        for (const step of definition.steps || []) {
          const { statement, values } = bindNamedParams(String(step.query || ''), params);
          if (step.assign) {
            const [row] = await queryOnConnection(conn, statement, values);
            if (row) Object.assign(params, row);
          } else {
            await runOnConnection(conn, statement, values);
          }
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
}
