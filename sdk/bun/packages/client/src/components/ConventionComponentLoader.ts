import { BaseComponent } from '@core3/client/components/BaseComponent';

type ComponentConstructor = {
  new (id: string, state?: any, definition?: any): BaseComponent;
  resolveState?: (definition: any, context: any) => any | Promise<any>;
};
type ComponentModule = Record<string, any>;
type GlobLoader = () => Promise<ComponentModule>;

// Vite replaces this glob with a module map. The catch keeps the same source
// usable by the Bun-native development server, where glob is not defined.
let discoveredModules: Record<string, GlobLoader> = {};
try {
  discoveredModules = (import.meta as any).glob('./*.ts');
} catch {
  discoveredModules = {};
}

function validType(type: string) {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(type);
}

export class ConventionComponentLoader {
  async load(type: string): Promise<ComponentConstructor | null> {
    if (!validType(type)) throw new Error(`Invalid component type: ${type}`);
    const path = `./${type}.ts`;
    const module = discoveredModules[path]
      ? await discoveredModules[path]()
      : await import(/* @vite-ignore */ `/packages/client/src/components/${type}.ts`);
    const Component = module[type];
    if (!Component) throw new Error(`Component export not found for convention: ${type}`);
    return Component as ComponentConstructor;
  }

  async create(type: string, id: string, definition: any, context: any = {}) {
    const Component = await this.load(type);
    const state = typeof Component.resolveState === 'function'
      ? await Component.resolveState(definition, context)
      : definition || {};
    return new Component(id, state, definition);
  }
}
