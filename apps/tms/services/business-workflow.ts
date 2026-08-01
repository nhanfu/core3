import { StateWorkflow } from '../../lib/workflow.ts';

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Cancelled';
export type QuoteWorkflowAction = 'send' | 'accept' | 'revise' | 'cancel';

export const quoteWorkflow = new StateWorkflow<QuoteWorkflowAction, QuoteStatus>({
  send: { from: ['Draft'], to: 'Sent' },
  accept: { from: ['Sent'], to: 'Accepted' },
  revise: { from: ['Sent'], to: 'Draft' },
  cancel: { from: ['Draft', 'Sent'], to: 'Cancelled' },
});

export type PayrollStatus = 'Draft' | 'Approved' | 'Paid';
export type PayrollWorkflowAction = 'approve' | 'reopen' | 'mark_paid';

export const payrollWorkflow = new StateWorkflow<PayrollWorkflowAction, PayrollStatus>({
  approve: { from: ['Draft'], to: 'Approved' },
  reopen: { from: ['Approved'], to: 'Draft' },
  mark_paid: { from: ['Approved'], to: 'Paid' },
});
