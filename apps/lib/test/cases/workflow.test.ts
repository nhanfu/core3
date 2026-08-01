import { describe, expect, it } from 'vitest';
import { StateWorkflow, WorkflowTransitionError } from '../../workflow.ts';

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
