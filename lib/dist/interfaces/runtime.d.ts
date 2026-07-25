import type { IRepository } from './datasource';
import type { User } from './auth';
/**
 * Injected as `ctx` into every inline or external script.
 * Available in datasource scripts, action handlers, and CRUD custom functions.
 */
export interface ScriptContext {
    /** Current authenticated user */
    user: User;
    /** Resolved YAML params for this invocation */
    params: Record<string, unknown>;
    /**
     * Fetch another datasource result by id.
     * Permission checks run on that datasource too.
     */
    datasource(id: string): Promise<unknown>;
    /**
     * Direct database access — already permission-gated.
     * Row-level values from SecurityContext are pre-applied.
     */
    db: IRepository;
    /**
     * Sandboxed HTTP client.
     * Allowed URLs configured by the host application.
     */
    http: {
        get(url: string, opts?: RequestInit): Promise<unknown>;
        post(url: string, body: unknown, opts?: RequestInit): Promise<unknown>;
        put(url: string, body: unknown, opts?: RequestInit): Promise<unknown>;
        delete(url: string, opts?: RequestInit): Promise<unknown>;
    };
    /** Structured logger — writes to the framework's log pipeline */
    log: {
        info(message: string, ...args: unknown[]): void;
        warn(message: string, ...args: unknown[]): void;
        error(message: string, ...args: unknown[]): void;
    };
    /** Whitelisted environment variables */
    env: Record<string, string>;
    /**
     * Submit an action from within a script (e.g. send a notification after saving).
     * Triggers the named action handler with the given params.
     */
    submit(action: string, params?: Record<string, unknown>): Promise<unknown>;
}
/**
 * Pluggable scripting runtime.
 * Each supported language provides one adapter.
 */
export interface RuntimeAdapter {
    language: string;
    /**
     * Execute script code in a sandboxed environment.
     * Must return the value returned by the script (via `return` statement).
     */
    execute(code: string, ctx: ScriptContext, opts?: RuntimeOptions): Promise<unknown>;
}
export interface RuntimeOptions {
    timeout?: number;
    memoryLimit?: number;
}
export type BuiltInRuntime = 'javascript' | 'typescript' | 'python' | 'lua' | 'shell';
export interface PageConfig {
    title: string;
    auth: import('./auth').PageAuthConfig;
    events?: EventConfig;
    layout?: LayoutConfig;
}
export interface EventConfig {
    /** Class name (string) that handles page-level events */
    class: string;
    handles: Array<{
        /** Component id to attach handlers to */
        target: string;
        /** Events to listen for: 'cellClick' | 'rowSelect' | 'bulkAction' | 'fieldChange' | 'save' */
        on: string[];
    }>;
}
export interface LayoutConfig {
    type: 'full' | 'split-panel' | 'master-detail' | 'tabbed';
    master?: import('./component').ComponentDef;
    detail?: import('./component').ComponentDef;
}
/**
 * Lightweight pub/sub used by the page-level event handler to coordinate
 * between components without direct references.
 *
 * Emitted automatically by the framework:
 *   - 'cellClick'   (component, row)
 *   - 'rowSelect'   (rows[])
 *   - 'bulkAction'  (action, selectedIds[])
 *   - 'fieldChange' (field, value, formState)
 *   - 'dataLoad'    (datasourceId, response)
 */
export interface EventBus {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    once(event: string, handler: (...args: unknown[]) => void): void;
}
export interface FrameworkConfig {
    auth: import('./auth').IAuthProvider;
    runtimes?: RuntimeAdapter[];
    baseUrl?: string;
    debug?: boolean;
}
