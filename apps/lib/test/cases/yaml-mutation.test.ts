import { describe, expect, it } from 'vitest';
import { executeYamlMutation } from '../../yaml/mutation.ts';

describe('YAML mutation scripts', () => {
  it('mutates the YAML document with input references and loops', () => {
    const result = executeYamlMutation({ workflow: { states: [], transitions: [] } }, {
      steps: [
        { append: 'workflow.states', value: { id: '$input.label', label: '$input.label' } },
        { for_each: { input: 'from', steps: [{ append: 'workflow.transitions', value: { from: '$item', to: '$input.label', id: '${slug(input.from)}_to_${slug(input.label)}' } }] } },
      ],
    }, { label: 'In Review', from: ['Draft'] }) as any;
    expect(result.workflow.states).toEqual([{ id: 'In Review', label: 'In Review' }]);
    expect(result.workflow.transitions).toEqual([{ from: 'Draft', to: 'In Review', id: 'draft_to_in_review' }]);
  });
});
