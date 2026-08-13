declare global {
  interface Window {
    __CORE3_API_BASE__?: string;
    __CORE3_USER__?: Record<string, unknown>;
  }
}

declare module '@duckdb/duckdb-wasm' {
  const duckdb: any;
  export = duckdb;
}

export {};
