import { describe, expect, it } from 'vitest';
import { validateWorkflowDefinition } from '@core3/server/yaml/workflow-schema';

function validWorkflow() {
  return {
    workflow: {
      id: 'orders',
      entity: 'orders',
      handler: 'order_status',
      initial: 'Draft',
      permission: 'orders.write',
      mutable: true,
      states: [
        { id: 'Draft', label: 'Draft', color: 'neutral' },
        { id: 'Approved', label: 'Approved', color: 'green', terminal: true },
      ],
      transitions: [{
        id: 'approve',
        from: 'Draft',
        to: 'Approved',
        permission: 'orders.approve',
        conditions: { all: [{ field: 'total_amount', operator: 'greater_than', value: 0 }] },
        condition_message: 'Order total must be positive',
      }],
    },
  };
}

describe('workflow schema', () => {
  it('accepts mutable states, transitions, permissions, and structured conditions', () => {
    expect(validateWorkflowDefinition(validWorkflow())).toMatchObject({ id: 'orders', initial: 'Draft', mutable: true });
  });

  it('rejects transitions that reference undeclared states', () => {
    const definition = validWorkflow();
    definition.workflow.transitions[0].to = 'Missing';
    expect(() => validateWorkflowDefinition(definition)).toThrow(/to references unknown state "Missing"/);
  });

  it('rejects unsupported condition operators', () => {
    const definition = validWorkflow() as any;
    definition.workflow.transitions[0].conditions.all[0].operator = 'execute_sql';
    expect(() => validateWorkflowDefinition(definition)).toThrow(/operator is not supported/);
  });
});
