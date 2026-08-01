import { StateWorkflow } from '../../../lib/workflow.ts';

export type FinancialDocumentStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Paid'
  | 'Cancelled';
export type FinancialWorkflowAction =
  | 'submit_for_approval'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'mark_paid';
export type FinancialDocumentKind =
  | 'debit_note'
  | 'payment_request'
  | 'advance'
  | 'settlement';

export const financialWorkflow = new StateWorkflow<
  FinancialWorkflowAction,
  FinancialDocumentStatus
>({
  submit_for_approval: { from: ['Draft'], to: 'Pending Approval' },
  approve: { from: ['Pending Approval'], to: 'Approved' },
  reject: { from: ['Pending Approval'], to: 'Draft' },
  cancel: { from: ['Draft', 'Pending Approval', 'Approved'], to: 'Cancelled' },
  mark_paid: { from: ['Approved'], to: 'Paid' },
});
