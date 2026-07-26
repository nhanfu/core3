export type TemplateAction = 'create' | 'update' | 'delete' | 'move_up' | 'move_down';
export const TEMPLATE_ACTION_REGISTRY: Record<string, { operation: TemplateAction; permission: string }> = {
  'system.print_blocks.create': { operation: 'create', permission: 'system.write' },
  'system.print_blocks.update': { operation: 'update', permission: 'system.write' },
  'system.print_blocks.delete': { operation: 'delete', permission: 'system.write' },
  'system.print_blocks.move_up': { operation: 'move_up', permission: 'system.write' },
  'system.print_blocks.move_down': { operation: 'move_down', permission: 'system.write' },
};
