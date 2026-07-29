import { describe, expect, it } from 'vitest';
import { AppRegistry } from '../../services/AppRegistry.ts';
import { AppLauncher } from '../../components/AppLauncher.ts';

describe('AppRegistry', () => {
  it('registers available and coming-soon manifests without losing order', () => {
    const registry = new AppRegistry([
      { id: 'crm', name: 'CRM', rootMenus: ['crm.root'] },
      { id: 'inventory', name: 'Inventory', status: 'coming_soon' },
    ]);

    expect(registry.list().map(app => app.id)).toEqual(['crm', 'inventory']);
    expect(registry.available().map(app => app.id)).toEqual(['crm']);
    expect(registry.get('inventory')?.status).toBe('coming_soon');
    expect(registry.get('crm')?.rootMenus).toEqual(['crm.root']);
  });
});

describe('AppLauncher', () => {
  it('renders registered applications and emits a selection', async () => {
    const container = document.createElement('div');
    const launcher = new AppLauncher('launcher', {
      open: true,
      activeApp: 'crm',
      apps: [
        { id: 'crm', name: 'CRM', icon: 'users' },
        { id: 'inventory', name: 'Inventory', icon: 'truck', status: 'coming_soon' },
      ],
    });
    const selected: string[] = [];
    launcher._onAction = async (action: string, params: { app: string }) => { if (action === 'select') selected.push(params.app); };
    launcher.mount(container);

    expect(container.querySelectorAll('[data-app-id]')).toHaveLength(2);
    (container.querySelector('[data-app-id="inventory"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(selected).toEqual(['inventory']);
    expect(container.querySelector('.odoo-app-launcher-backdrop')).toBeNull();
  });
});
