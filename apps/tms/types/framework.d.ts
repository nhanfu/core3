declare module '@core3/framework' {
  export const SERVICE_KEYS: {
    repository: string;
    auth: string;
  };

  export class ServiceRegistry {
    register<T>(key: string, implementation: T): this;
    resolve<T = any>(key: string): T;
  }

  export function createFramework(config?: {
    repository?: unknown;
    auth?: unknown;
  }): ServiceRegistry;
}

declare module '@core3/framework/runtime.ts' {
  export class BaseComponent<S = any> {
    id: string;
    state: S;
    parent: BaseComponent | null;
    children: BaseComponent[];
    _container: HTMLElement | null;
    _onAction?: (action: string, params?: Record<string, unknown>, source?: BaseComponent) => unknown;
    _transport?: { submit?: (action: string, params?: Record<string, unknown>) => unknown } | null;

    constructor(id: string, state?: S);
    get root(): BaseComponent;
    setState(partial: Partial<S> | Record<string, unknown>, redraw?: boolean): void;
    redraw(): void;
    createChild<C extends BaseComponent>(
      Ctor: new (id: string, state?: any) => C,
      stateOrId: string | Record<string, unknown>,
      maybeState?: Record<string, unknown>
    ): C;
    find(id: string): BaseComponent | null;
    mount(container: HTMLElement): void;
    submit(action: string, params?: Record<string, unknown>): Promise<unknown>;
    draw(container: HTMLElement): void;
  }
}

declare module '@core3/framework/html.ts' {
  export const html: any;
  export class HTML {
    [key: string]: any;
  }
}

declare module '@core3/framework/navigate.ts' {
  export function registerNavigator(fn: (pageId: string, params?: Record<string, unknown>) => void): void;
  export function navigate(pageId: string, params?: Record<string, unknown>): void;
  export function getPageParams(): Record<string, string>;
  export function replaceParams(params?: Record<string, unknown>): void;
}

declare module '@core3/framework/page-renderer.ts' {
  export function renderPage(config: any, options?: { container?: HTMLElement }): Promise<any>;
  export function register(name: string, Ctor: any): void;
  export function registerAll(map: Record<string, any>): void;
}

declare module '@core3/framework/yaml/schema.ts' {
  export function validatePageDefinition(
    config: unknown,
    options?: { allowExternalSources?: boolean },
  ): unknown;
}

declare module '@core3/framework/workflow.ts' {
  export type WorkflowTransition<State extends string = string> = {
    from: readonly State[];
    to: State;
  };

  export class StateWorkflow<Action extends string, State extends string> {
    constructor(definition: Record<Action, WorkflowTransition<State>>);
    transition(action: Action, currentState: State): State;
    get(action: Action): WorkflowTransition<State>;
    available(currentState: State): Action[];
  }
}

declare module '@core3/framework/client.ts' {
  export const client: {
    setToken(token: string | null): void;
    onRefresh(fn: null | (() => Promise<string>)): void;
    query(vm: any): Promise<any>;
    patch(vm: any): Promise<any>;
    action(name: string, params?: Record<string, unknown>): Promise<any>;
    patchMany(vms: any): Promise<any>;
    deactivate(table: string, id: string | number): Promise<any>;
    hardDelete(table: string, id: string | number): Promise<any>;
    uploadFile(file: File, meta?: Record<string, unknown>): Promise<any>;
  };
}

export {};
