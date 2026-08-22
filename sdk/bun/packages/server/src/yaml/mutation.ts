export type YamlMutationStep = {
  set?: string;
  append?: string;
  remove?: string;
  for_each?: { input: string; as?: string; steps: YamlMutationStep[] };
  where?: { path: string; equals?: unknown; not_equals?: unknown };
  value?: unknown;
};

export type YamlMutationDefinition = {
  steps: YamlMutationStep[];
};

type Context = { input: Record<string, unknown>; item?: unknown };

export function executeYamlMutation(document: unknown, definition: YamlMutationDefinition, input: Record<string, unknown>): unknown {
  const result = structuredClone(document);
  for (const step of definition.steps || []) applyStep(result, step, { input });
  return result;
}

function applyStep(document: any, step: YamlMutationStep, context: Context): void {
  if (step.for_each) {
    const values = resolvePath(context.input, step.for_each.input);
    if (!Array.isArray(values)) throw new Error(`YAML mutation input is not an array: ${step.for_each.input}`);
    for (const item of values) {
      const child = { ...context, item };
      for (const childStep of step.for_each.steps || []) applyStep(document, childStep, child);
    }
    return;
  }

  const path = step.set || step.append || step.remove;
  if (!path) throw new Error('YAML mutation step requires set, append, remove, or for_each');
  const parent = parentAt(document, path);
  const key = path.split('.').pop()!;
  const current = parent[key];
  if (step.set) parent[key] = resolveValue(step.value, context);
  if (step.append) {
    if (!Array.isArray(current)) throw new Error(`YAML mutation target is not an array: ${step.append}`);
    current.push(resolveValue(step.value, context));
  }
  if (step.remove) {
    if (!Array.isArray(current)) throw new Error(`YAML mutation target is not an array: ${step.remove}`);
    const where = step.where;
    if (!where) throw new Error(`YAML mutation remove requires where: ${step.remove}`);
    const expected = resolveValue(where.equals ?? where.not_equals, context);
    parent[key] = current.filter((entry: any) => {
      const actual = resolvePath(entry, where.path);
      return where.not_equals !== undefined ? actual !== expected : actual === expected;
    });
  }
}

function parentAt(root: any, path: string): any {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) throw new Error('YAML mutation path cannot be empty');
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!current || typeof current !== 'object' || !(part in current)) throw new Error(`YAML mutation path not found: ${path}`);
    current = current[part];
  }
  if (!current || typeof current !== 'object') throw new Error(`YAML mutation parent is not an object: ${path}`);
  return current;
}

function resolvePath(value: any, path: string): unknown {
  return path.split('.').filter(Boolean).reduce((current, part) => current == null ? undefined : current[part], value);
}

function resolveValue(value: unknown, context: Context): unknown {
  if (Array.isArray(value)) return value.map((entry) => resolveValue(entry, context));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveValue(entry, context)]));
  if (typeof value !== 'string') return value;
  const exact = value.match(/^\$(input|item)(?:\.(.+))?$/);
  if (exact) return exact[2] ? resolvePath(exact[1] === 'input' ? context.input : context.item, exact[2]) : (exact[1] === 'input' ? context.input : context.item);
  return value.replace(/\$\{(input|item)(?:\.([^}]+))?\}|\$\{slug\((input|item)(?:\.([^}]+))?\)\}/g, (_match, scope, path, slugScope, slugPath) => {
    const target = slugScope ? (slugScope === 'input' ? context.input : context.item) : (scope === 'input' ? context.input : context.item);
    const resolved = (slugPath || path) ? resolvePath(target, slugPath || path) : target;
    return slugScope ? slug(String(resolved ?? '')) : String(resolved ?? '');
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'state';
}
