/**
 * HTTP client singleton — JWT-aware, routes to DuckDB WASM or HTTP backend.
 */
declare class Client {
    _token: any;
    _refreshFn: any;
    constructor();
    setToken(token: any): void;
    onRefresh(fn: any): void;
    _headers(): {
        'Content-Type': string;
    };
    _resolveBase(): any;
    _fetch(url: any, opts: any): Promise<any>;
    query(vm: any): Promise<any>;
    patch(vm: any): Promise<any>;
    patchMany(vms: any): Promise<any>;
    deactivate(table: any, id: any): Promise<any>;
    hardDelete(table: any, id: any): Promise<any>;
    uploadFile(file: any, meta?: {}): Promise<any>;
}
export declare const client: Client;
export {};
