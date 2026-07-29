import { describe, expect, it } from 'vitest';
import { ActionService } from '../../services/ActionService.ts';
import { ModuleMenuTree } from '../../services/ModuleMenuTree.ts';

describe('metadata action services', () => {
  it('resolves menu actions and preserves action state', () => {
    const service = new ActionService([{ id: 'crm.pipeline', model: 'crm.lead', views: ['kanban'] }], [{ id: 'crm.pipeline', label: 'Pipeline', action: 'crm.pipeline' }]);
    expect(service.stateFor('crm.pipeline', { view: 'kanban', search: 'office' })).toMatchObject({ action: 'crm.pipeline', model: 'crm.lead', view: 'kanban', search: 'office' });
  });

  it('builds nested permission-filtered menus', () => {
    const tree = new ModuleMenuTree([{ id: 'root', label: 'Root' }, { id: 'settings', parent: 'root', label: 'Settings', groups: ['manager'] }]);
    expect(tree.tree('salesperson')[0].children).toHaveLength(0);
    expect(tree.tree('manager')[0].children[0].id).toBe('settings');
  });
});
