import type { MenuDefinition } from './ActionService.ts';

export type MenuNode = MenuDefinition & { children: MenuNode[] };

/** Builds a permission-filtered module menu tree from YAML menu declarations. */
export class ModuleMenuTree {
  private readonly menus: MenuDefinition[];

  constructor(menus: MenuDefinition[]) {
    this.menus = menus;
  }

  tree(role?: string) {
    const visible = this.menus.filter(menu => !menu.groups?.length || (role && menu.groups.includes(role)));
    const nodes = new Map(visible.map(menu => [menu.id, { ...menu, children: [] as MenuNode[] }]));
    const roots: MenuNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parent ? nodes.get(node.parent) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }
}
