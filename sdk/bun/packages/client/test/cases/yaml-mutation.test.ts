import { describe, expect, it } from 'vitest';
import { executeYamlMutation } from '@core3/server/yaml/mutation';

describe('YAML mutation scripts', () => {
  it('mutates the YAML document with input references and loops', () => {
    const result = executeYamlMutation({ workflow: { states: [], transitions: [] } }, {
      steps: [
        { append: 'workflow.states', value: { id: '$input.label', label: '$input.label' } },
        { for_each: { input: 'from', steps: [{ append: 'workflow.transitions', value: { from: '$item', to: '$input.label', id: '${slug(item)}_to_${slug(input.label)}' } }] } },
      ],
    }, { label: 'In Review', from: ['Draft'] }) as any;
    expect(result.workflow.states).toEqual([{ id: 'In Review', label: 'In Review' }]);
    expect(result.workflow.transitions).toEqual([{ from: 'Draft', to: 'In Review', id: 'draft_to_in_review' }]);
  });

  it('creates unique transition ids for every loop item', () => {
    const result = executeYamlMutation({ workflow: { transitions: [] } }, {
      steps: [{ for_each: { input: 'from', steps: [{ append: 'workflow.transitions', value: {
        id: '${slug(item)}_to_${slug(input.label)}', from: '$item', to: '$input.label', permission: '$input.permission',
      } }] } }],
    }, { label: 'Ready', from: ['Draft', 'Pending Approval'], permission: 'orders.write' }) as any;
    expect(result.workflow.transitions.map((transition: any) => transition.id)).toEqual([
      'draft_to_ready', 'pending_approval_to_ready',
    ]);
  });
});
