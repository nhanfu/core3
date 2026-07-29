import { describe, expect, it } from 'vitest';
import { OdooDialog } from '../../components/OdooDialog.ts';

describe('OdooDialog', () => {
  it('submits typed values and supports cancellation', () => {
    const container = document.createElement('div');
    const dialog = new OdooDialog('dialog', { open: true, title: 'Assign', fields: [
      { name: 'name', label: 'Name', required: true, value: 'Mitchell' },
      { name: 'stage', label: 'Stage', type: 'select', value: 'won', options: [{ value: 'new', label: 'New' }, { value: 'won', label: 'Won' }] },
    ] });
    const actions: Array<{ action: string; values: unknown }> = [];
    dialog._onAction = (action: string, values: unknown) => actions.push({ action, values });
    dialog.mount(container);
    expect(container.querySelector('h2')?.textContent).toBe('Assign');
    (container.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(actions[0]).toEqual({ action: 'submit', values: { name: 'Mitchell', stage: 'won' } });

    const cancel = new OdooDialog('cancel-dialog', { open: true });
    const cancelContainer = document.createElement('div');
    cancel._onAction = (action: string) => actions.push({ action, values: {} });
    cancel.mount(cancelContainer);
    (cancelContainer.querySelector('.odoo-dialog-close') as HTMLElement).click();
    expect(actions.at(-1)?.action).toBe('cancel');
  });
});
