import { StateWorkflow } from '../../lib/workflow.ts';

export type OrderStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Cancelled';
export type OrderWorkflowAction = 'submit_for_approval' | 'approve' | 'reject' | 'cancel';

export const orderWorkflow = new StateWorkflow<OrderWorkflowAction, OrderStatus>({
  submit_for_approval: { from: ['Draft'], to: 'Pending Approval' },
  approve: { from: ['Pending Approval'], to: 'Approved' },
  reject: { from: ['Pending Approval'], to: 'Draft' },
  cancel: { from: ['Draft', 'Pending Approval', 'Approved'], to: 'Cancelled' },
});

export const ORDER_ACTION_REGISTRY: Record<
  string,
  { action: OrderWorkflowAction; permission: string }
> = {
  'orders.submit_for_approval': {
    action: 'submit_for_approval',
    permission: 'orders.write',
  },
  'orders.approve': {
    action: 'approve',
    permission: 'orders.approve',
  },
  'orders.reject': {
    action: 'reject',
    permission: 'orders.approve',
  },
  'orders.cancel': {
    action: 'cancel',
    permission: 'orders.write',
  },
};
