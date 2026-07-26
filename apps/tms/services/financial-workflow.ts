import { StateWorkflow } from '@core3/framework/workflow.ts';

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

export type FinancialActionDefinition = {
  action: FinancialWorkflowAction;
  kind: FinancialDocumentKind;
  permission: string;
};

export const FINANCIAL_ACTION_REGISTRY: Record<string, FinancialActionDefinition> = {};

for (const definition of [
  { prefix: 'accounting.debit_notes', kind: 'debit_note', canPay: true },
  { prefix: 'accounting.payment_requests', kind: 'payment_request', canPay: true },
  { prefix: 'accounting.advances', kind: 'advance', canPay: false },
  { prefix: 'accounting.settlements', kind: 'settlement', canPay: false },
] as const) {
  FINANCIAL_ACTION_REGISTRY[`${definition.prefix}.submit_for_approval`] = {
    action: 'submit_for_approval',
    kind: definition.kind,
    permission: 'accounting.write',
  };
  FINANCIAL_ACTION_REGISTRY[`${definition.prefix}.approve`] = {
    action: 'approve',
    kind: definition.kind,
    permission: 'accounting.approve',
  };
  FINANCIAL_ACTION_REGISTRY[`${definition.prefix}.reject`] = {
    action: 'reject',
    kind: definition.kind,
    permission: 'accounting.approve',
  };
  FINANCIAL_ACTION_REGISTRY[`${definition.prefix}.cancel`] = {
    action: 'cancel',
    kind: definition.kind,
    permission: 'accounting.write',
  };
  if (definition.canPay) {
    FINANCIAL_ACTION_REGISTRY[`${definition.prefix}.mark_paid`] = {
      action: 'mark_paid',
      kind: definition.kind,
      permission: 'accounting.pay',
    };
  }
}
