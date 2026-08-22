import { BaseComponent } from '@core3/client/components/BaseComponent';

type ComponentConstructor = {
  new (id: string, state?: any, definition?: any): BaseComponent;
  resolveState?: (definition: any, context: any) => any | Promise<any>;
};
type ComponentModule = Record<string, any>;
type ComponentLoader = () => Promise<ComponentModule>;

// Vite replaces these globs with module maps. The fallback keeps the same
// source usable by the Bun-served development browser, where glob is absent.
let eagerModules: Record<string, ComponentModule> = {};
let discoveredModules: Record<string, ComponentLoader> = {};
try {
  eagerModules = (import.meta as any).glob(['./*Cell.ts', './Odoo*Editor.ts', './LineItem*Input.ts', './Page*Field.ts'], { eager: true });
  discoveredModules = (import.meta as any).glob(['./*.ts', '!./*Cell.ts', '!./Odoo*Editor.ts', '!./LineItem*Input.ts', '!./Page*Field.ts']);
} catch {
  eagerModules = {};
  discoveredModules = {};
}

function validType(type: string) {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(type);
}

export class ComLoader {
  resolveSync(type: string): ComponentConstructor {
    if (!validType(type)) throw new Error(`Invalid component type: ${type}`);
    const Component = eagerModules[`./${type}.ts`]?.[type];
    if (!Component) throw new Error(`Component export not found for convention: ${type}`);
    return Component as ComponentConstructor;
  }

  createSync(type: string, id: string, definition: any, context: any = {}) {
    const Component = this.resolveSync(type);
    const state = this.stateSync(type, definition, context);
    return new Component(id, state, context.constructorDefinition ?? definition);
  }

  stateSync(type: string, definition: any, context: any = {}) {
    const Component = this.resolveSync(type);
    return typeof Component.resolveState === 'function'
      ? Component.resolveState(definition, context)
      : definition || {};
  }

  async load(type: string): Promise<ComponentConstructor | null> {
    if (!validType(type)) throw new Error(`Invalid component type: ${type}`);
    const path = `./${type}.ts`;
    const module = eagerModules[path]
      ? eagerModules[path]
      : discoveredModules[path]
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
