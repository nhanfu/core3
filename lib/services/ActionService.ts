export type ActionDefinition = {
  id: string;
  model?: string;
  domain?: unknown;
  context?: Record<string, unknown>;
  views?: string[];
};

export type MenuDefinition = {
  id: string;
  parent?: string;
  label?: string;
  icon?: string;
  action?: string;
  groups?: string[];
};

export type ActionState = {
  action?: string;
  model?: string;
  domain?: unknown;
  context?: Record<string, unknown>;
  view?: string;
  search?: string;
  groupBy?: string;
  selected?: string[];
};

/** Resolves declarative menu/action metadata without coupling the framework to a module. */
export class ActionService {
  constructor(private readonly actions: ActionDefinition[], private readonly menus: MenuDefinition[]) {}

  resolve(menuId: string) {
    const menu = this.menus.find(item => item.id === menuId);
    const action = menu?.action ? this.actions.find(item => item.id === menu.action) : undefined;
    return { menu, action };
  }

  stateFor(menuId: string, state: Partial<ActionState> = {}): ActionState {
    const resolved = this.resolve(menuId);
    return { action: resolved.action?.id, model: resolved.action?.model, domain: resolved.action?.domain, context: resolved.action?.context, ...state };
  }
}
