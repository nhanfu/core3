export type DatabaseConnection = {
  run(sql: string, ...args: any[]): Promise<any>;
  all(sql: string, ...args: any[]): Promise<any[]>;
  close(callback?: () => void): void;
  inTransaction?: boolean;
};

export type DatabaseDriver = 'postgres' | 'duckdb' | 'mysql' | 'oracle' | 'sqlserver';

export type MigrationFeature = 'partitioning' | 'columnstore' | 'transactional_ddl' | 'generated_uuid';

export type DatabaseDialect = {
  driver: DatabaseDriver;
  placeholder(index: number): string;
  quoteIdentifier(identifier: string): string;
  supports(feature: MigrationFeature): boolean;
};

export type DatabaseAdapter = {
  driver?: DatabaseDriver;
  dialect?: DatabaseDialect;
  connect(): DatabaseConnection;
  close(callback?: () => void): void;
  partition?(definition: any): Promise<void>;
  unpartition?(table: string): Promise<void>;
  prepareQueryWindow?(definition: any, bounds: any): Promise<() => Promise<void>>;
};
