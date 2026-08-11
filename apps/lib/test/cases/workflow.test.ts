import { describe, expect, it } from 'vitest';
import {
  declaredFromStates,
  findDeclaredMove,
  findDeclaredTransition,
  StateWorkflow,
  WorkflowTransitionError,
  workflowConditionsMatch,
} from '../../workflow.ts';

type OrderState = 'Draft' | 'Pending Approval' | 'Approved' | 'Cancelled';
type OrderAction = 'submit_for_approval' | 'approve' | 'reject' | 'cancel';

const workflow = new StateWorkflow<OrderAction, OrderState>({
  submit_for_approval: { from: ['Draft'], to: 'Pending Approval' },
  approve: { from: ['Pending Approval'], to: 'Approved' },
  reject: { from: ['Pending Approval'], to: 'Draft' },
  cancel: { from: ['Draft', 'Pending Approval', 'Approved'], to: 'Cancelled' },
});

describe('StateWorkflow', () => {
  it('resolves target states from named actions', () => {
    expect(workflow.transition('submit_for_approval', 'Draft')).toBe('Pending Approval');
    expect(workflow.transition('approve', 'Pending Approval')).toBe('Approved');
    expect(workflow.transition('reject', 'Pending Approval')).toBe('Draft');
  });

  it('rejects invalid transitions with actionable context', () => {
    expect(() => workflow.transition('approve', 'Draft')).toThrow(WorkflowTransitionError);
    try {
      workflow.transition('approve', 'Draft');
    } catch (error) {
      const transitionError = error as WorkflowTransitionError;
      expect(transitionError.action).toBe('approve');
      expect(transitionError.currentState).toBe('Draft');
      expect(transitionError.allowedStates).toEqual(['Pending Approval']);
    }
  });

  it('lists only actions available from the current state', () => {
    expect(workflow.available('Draft')).toEqual(['submit_for_approval', 'cancel']);
    expect(workflow.available('Cancelled')).toEqual([]);
  });

  it('keeps target states in the server-owned definition', () => {
    expect(Object.keys(workflow.get('approve'))).toEqual(['from', 'to']);
    expect(workflow.get('approve').to).toBe('Approved');
  });
});

describe('declared workflow transitions', () => {
  const transitions = [
    { id: 'submit_for_approval', from: 'Draft', to: 'Pending Approval', permission: 'orders.write' },
    { id: 'approve', from: 'Pending Approval', to: 'Approved', permission: 'orders.approve' },
    { id: 'reject', from: 'Pending Approval', to: 'Draft', permission: 'orders.approve' },
    { id: 'cancel', from: ['Draft', 'Pending Approval', 'Approved'], to: 'Cancelled', permission: 'orders.write' },
  ];

  it('resolves named actions and Kanban moves from the same declarations', () => {
    const approval = findDeclaredTransition(transitions, 'approve');
    expect(approval).toMatchObject({ from: 'Pending Approval', to: 'Approved', permission: 'orders.approve' });
    expect(findDeclaredMove(transitions, 'Pending Approval', 'Approved')).toBe(approval);
    expect(declaredFromStates(approval!)).toEqual(['Pending Approval']);
  });

  it('rejects undeclared direct moves', () => {
    expect(findDeclaredMove(transitions, 'Draft', 'Approved')).toBeUndefined();
    expect(findDeclaredMove(transitions, 'Cancelled', 'Draft')).toBeUndefined();
  });

  it('supports transitions with multiple source states', () => {
    expect(findDeclaredMove(transitions, 'Approved', 'Cancelled')?.id).toBe('cancel');
  });
});

describe('workflow conditions', () => {
  const order = { customer_name: 'Acme', total_amount: 100, shipment_type: 'FTL' };

  it('evaluates structured all and any guards', () => {
    expect(workflowConditionsMatch(order, {
      all: [
        { field: 'customer_name', operator: 'present' },
        { field: 'total_amount', operator: 'greater_than', value: 0 },
      ],
      any: [
        { field: 'shipment_type', operator: 'equals', value: 'LTL' },
        { field: 'shipment_type', operator: 'equals', value: 'FTL' },
      ],
    })).toBe(true);
  });

  it('rejects records that do not satisfy a guard', () => {
    expect(workflowConditionsMatch(order, {
      all: [{ field: 'total_amount', operator: 'less_than_or_equal', value: 0 }],
    })).toBe(false);
  });
});
