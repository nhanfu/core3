import { describe, expect, it } from 'vitest';
import { OdooFormView } from '@core3/client/components/OdooFormView';

describe('OdooFormView conditional groups', () => {
  it('hides inactive-only notebook groups for active records', () => {
    const host = document.createElement('div');
    const form = new OdooFormView('employee', { record: { id: 'e1', active: true } }, {
      source: 'employee_detail',
      notebook: {
        active: 'work',
        tabs: [{
          id: 'work',
          label: 'Work',
          groups: [
            { title: 'Work', fields: [{ field: 'id', label: 'Employee' }] },
            { title: 'Departure', show_if: 'state.employee_detail.active === false', fields: [{ field: 'id', label: 'Departure Date' }] },
          ],
        }],
      },
    });

    form.mount(host);

    expect(host.querySelector('.o-form-group-title')?.textContent).toBe('Work');
    expect(host.textContent).not.toContain('Departure');
  });
});
