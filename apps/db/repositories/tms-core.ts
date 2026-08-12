import { queryOnConnection, runOnConnection } from './tms-shared.ts';
import { YamlMutationRuntime, type MutationDefinition } from '../../lib/server/yaml-mutation-runtime.ts';

export class DuckDbRepositoryCore {
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
}
