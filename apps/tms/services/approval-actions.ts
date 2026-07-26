export type ApprovalAction = 'create' | 'update' | 'delete' | 'move_up' | 'move_down';
export const APPROVAL_ACTION_REGISTRY: Record<string, { operation: ApprovalAction; permission: string }> = {
  'system.approval_steps.create': { operation: 'create', permission: 'system.write' },
  'system.approval_steps.update': { operation: 'update', permission: 'system.write' },
  'system.approval_steps.delete': { operation: 'delete', permission: 'system.write' },
  'system.approval_steps.move_up': { operation: 'move_up', permission: 'system.write' },
  'system.approval_steps.move_down': { operation: 'move_down', permission: 'system.write' },
};
