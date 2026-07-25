import type { IAuthProvider, User } from './interfaces/auth';
import type { DataSource } from './interfaces/datasource';
interface DbAdapter {
    query(sql: string, params?: Record<string, unknown>): Promise<unknown[]>;
}
interface RunAdapters {
    query?: (sql: string, params?: Record<string, unknown>) => Promise<unknown[]>;
    ws?: (url: string) => {
        send: (d: string) => void;
        close: () => void;
    };
    fetch?: (url: string, opts?: unknown) => Promise<unknown>;
}
interface ActionDef {
    source: 'generated' | 'custom';
    fn: unknown;
}
export declare class DataSourceRunner {
    private cache;
    private auth;
    private defaultDb?;
    constructor(auth: IAuthProvider, db?: {
        query?: DbAdapter['query'];
    });
    getAction(ds: DataSource, actionId: string): ActionDef | undefined;
    run(ds: DataSource, user: User, params: Record<string, unknown>, adapters?: RunAdapters): Promise<{
        data: unknown[];
        meta: {
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
}
export {};
