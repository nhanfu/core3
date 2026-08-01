import { StateWorkflow } from '../../../lib/workflow.ts';

export type OrderStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Cancelled';
export type OrderWorkflowAction = 'submit_for_approval' | 'approve' | 'reject' | 'cancel';

export const orderWorkflow = new StateWorkflow<OrderWorkflowAction, OrderStatus>({
  submit_for_approval: { from: ['Draft'], to: 'Pending Approval' },
  approve: { from: ['Pending Approval'], to: 'Approved' },
  reject: { from: ['Pending Approval'], to: 'Draft' },
  cancel: { from: ['Draft', 'Pending Approval', 'Approved'], to: 'Cancelled' },
});
