import { queryOnConnection, runOnConnection } from '@core3/server/database/sql';
import { YamlMutationRuntime, type MutationDefinition } from '../yaml-mutation-runtime.ts';
import { splitSQL } from '@core3/server/database/sql';

export class DuckDbRepository {
db: any;
private readonly mutationRuntime = new YamlMutationRuntime();

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
    return this.withConnection((conn) => this.mutationRuntime.execute(conn, definition as MutationDefinition, input));
  }

  async runStatements(sql: string): Promise<void> {
    for (const statement of splitSQL(sql)) await this.run(statement);
  }

  partition(definition: any): Promise<void> {
    return this.db.partition(definition);
  }

  unpartition(table: string): Promise<void> {
    return this.db.unpartition(table);
  }
}
