import { describe, expect, it } from 'vitest';
import { OdooShell } from '../../components/OdooShell.ts';

describe('OdooShell global chrome', () => {
  it('emits company and command-search actions', () => {
    const container = document.createElement('div');
    const shell = new OdooShell('shell', { companies: [{ id: 'sf', label: 'San Francisco' }, { id: 'ny', label: 'New York' }], nav: [{ id: 'pipeline', label: 'Pipeline' }] });
    const actions: string[] = [];
    shell._onAction = (action: string) => actions.push(action);
    shell.mount(container);
    const company = container.querySelector('.odoo-company-switcher') as HTMLSelectElement;
    company.value = 'ny';
    company.dispatchEvent(new Event('change'));
    (container.querySelector('.odoo-command-search') as HTMLElement).click();
    expect(actions).toEqual(['company_switch', 'command_search']);
    shell.setActiveNav('pipeline');
    expect(container.querySelector('.odoo-breadcrumb')?.textContent).toBe('CRM / Pipeline');
  });
});
