export type DatabaseConnection = {
  run(sql: string, ...args: any[]): Promise<any>;
  all(sql: string, ...args: any[]): Promise<any[]>;
  close(callback?: () => void): void;
  inTransaction?: boolean;
};

export type DatabaseAdapter = {
  connect(): DatabaseConnection;
  close(callback?: () => void): void;
  partition?(definition: any): Promise<void>;
  unpartition?(table: string): Promise<void>;
  prepareQueryWindow?(definition: any, bounds: any): Promise<() => Promise<void>>;
};
