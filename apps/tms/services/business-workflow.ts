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

type QuoteActionDefinition = {
  domain: 'quote';
  action: QuoteWorkflowAction;
  permission: string;
};

type PayrollActionDefinition = {
  domain: 'payroll';
  action: PayrollWorkflowAction;
  permission: string;
};

export type BusinessActionDefinition =
  | QuoteActionDefinition
  | PayrollActionDefinition;

export const BUSINESS_ACTION_REGISTRY: Record<string, BusinessActionDefinition> = {
  'quotes.send': { domain: 'quote', action: 'send', permission: 'crm.write' },
  'quotes.accept': { domain: 'quote', action: 'accept', permission: 'crm.write' },
  'quotes.revise': { domain: 'quote', action: 'revise', permission: 'crm.write' },
  'quotes.cancel': { domain: 'quote', action: 'cancel', permission: 'crm.write' },
  'hr.payroll.approve': {
    domain: 'payroll',
    action: 'approve',
    permission: 'hr.approve',
  },
  'hr.payroll.reopen': {
    domain: 'payroll',
    action: 'reopen',
    permission: 'hr.approve',
  },
  'hr.payroll.mark_paid': {
    domain: 'payroll',
    action: 'mark_paid',
    permission: 'hr.pay',
  },
};
