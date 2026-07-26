import { describe, expect, it } from 'vitest';
import {
  PageSchemaError,
  registerPageComponentSchema,
  validatePageDefinition,
} from '../../yaml/schema.ts';

function validPage() {
  return {
    title: 'Orders',
    page: { id: 'orders', auth: { require: ['orders.read'] } },
    datasources: [{
      id: 'orders',
      permission: 'orders.read',
      query: 'SELECT id, code FROM orders',
    }],
    toolbar: [{
      id: 'add-order-button',
      label: 'Add order',
      action: 'add_order',
      permission: 'orders.write',
      variant: 'primary',
    }],
    components: [{
      type: 'DataGrid',
      source: 'orders',
      row_key: 'id',
      columns: [
        { field: 'code', label: 'Code' },
        {
          field: 'actions',
          label: '',
          actions: [{ id: 'edit_order', label: 'Edit' }],
        },
      ],
    }],
    actions: [
      {
        id: 'add_order',
        type: 'form',
        title: 'Add order',
        table: 'orders',
        operation: 'insert',
        refresh: ['orders'],
        fields: [{ field: 'code', label: 'Code', type: 'text', required: true }],
      },
      {
        id: 'edit_order',
        type: 'form',
        title: 'Edit order',
        table: 'orders',
        operation: 'update',
        prefill: 'row',
        refresh: ['orders'],
        fields: [{ field: 'code', label: 'Code', type: 'text', required: true }],
      },
    ],
  };
}

describe('YAML page schema', () => {
  it('accepts a complete resource-list definition', () => {
    expect(() => validatePageDefinition(validPage())).not.toThrow();
  });

  it('rejects unknown root, component, and action properties', () => {
    const page = validPage() as any;
    page.script = 'alert(1)';
    page.components[0].vendor_options = {};
    page.actions[0].sql = 'DELETE FROM orders';

    expect(() => validatePageDefinition(page)).toThrow(PageSchemaError);
    try {
      validatePageDefinition(page);
    } catch (error) {
      const schemaError = error as PageSchemaError;
      expect(schemaError.issues).toContain('page config.script is not allowed');
      expect(schemaError.issues).toContain('components[0].vendor_options is not allowed');
      expect(schemaError.issues).toContain('actions[0].sql is not allowed');
    }
  });

  it('rejects duplicate IDs and broken references', () => {
    const page = validPage() as any;
    page.datasources.push({ ...page.datasources[0] });
    page.actions.push({ ...page.actions[1] });
    page.toolbar[0].action = 'missing_action';
    page.components[0].source = 'missing_source';
    page.components[0].columns[1].actions[0].id = 'missing_row_action';
    page.actions[0].refresh = ['missing_source'];

    expect(() => validatePageDefinition(page)).toThrow(PageSchemaError);
    try {
      validatePageDefinition(page);
    } catch (error) {
      const issues = (error as PageSchemaError).issues.join('\n');
      expect(issues).toContain('duplicates datasource "orders"');
      expect(issues).toContain('duplicates action "edit_order"');
      expect(issues).toContain('references unknown action "missing_action"');
      expect(issues).toContain('references unknown datasource "missing_source"');
      expect(issues).toContain('references unknown action "missing_row_action"');
    }
  });

  it('allows public page responses to reference server-owned sources', () => {
    const page = validPage() as any;
    delete page.datasources;

    expect(() => validatePageDefinition(page, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition(page)).toThrow(/unknown datasource "orders"/);
  });

  it('requires custom components to register their accepted keys', () => {
    const page = validPage() as any;
    page.components = [{ type: 'TestTimeline', source: 'orders', state_field: 'status' }];

    expect(() => validatePageDefinition(page)).toThrow(/has no registered schema/);

    registerPageComponentSchema('TestTimeline', ['state_field']);
    expect(() => validatePageDefinition(page)).not.toThrow();
  });

  it('accepts document detail components and named server forms', () => {
    const page = validPage() as any;
    page.toolbar = [];
    page.components = [
      {
        type: 'DocumentSummary',
        source: 'orders',
        title_field: 'code',
        status_field: 'status',
        columns: [{ field: 'customer', label: 'Customer' }],
      },
      {
        type: 'LineItemGrid',
        source: 'orders',
        title: 'Lines',
        actions: [{ id: 'add_line', label: 'Add line', permission: 'orders.write' }],
        columns: [{ field: 'description', label: 'Description' }],
      },
      {
        type: 'MoneySummary',
        source: 'orders',
        stats: [{ field: 'total', label: 'Total', color: 'blue' }],
      },
      {
        type: 'ApprovalTimeline',
        source: 'orders',
        action_field: 'action',
        detail_field: 'detail',
        timestamp_field: 'created_at',
      },
    ];
    page.actions = [{
      id: 'add_line',
      type: 'server_form',
      title: 'Add line',
      action: 'orders.lines.create',
      params: { id: '{state.id}' },
      refresh: ['orders'],
      fields: [{ field: 'description', label: 'Description', type: 'text', required: true }],
    }];

    expect(() => validatePageDefinition(page)).not.toThrow();
  });

  it('accepts named server actions without client-owned table or target state', () => {
    const page = validPage() as any;
    page.components[0].columns[1].actions.push({
      id: 'submit_order',
      label: 'Submit',
      show_if: "row.status === 'Draft'",
    });
    page.actions.push({
      id: 'submit_order',
      type: 'server',
      action: 'orders.submit_for_approval',
      confirm: 'Submit this order?',
      refresh: ['orders'],
    });

    expect(() => validatePageDefinition(page)).not.toThrow();
    expect(page.actions.at(-1)).not.toHaveProperty('table');
    expect(page.actions.at(-1)).not.toHaveProperty('body');
  });

  it('validates chat workspace source and action references', () => {
    const page = validPage() as any;
    page.datasources.push({
      id: 'messages',
      permission: 'chat.read',
      query: 'SELECT id, thread_id, body FROM chat_messages',
    });
    page.toolbar = [];
    page.components = [{
      type: 'ChatWorkspace',
      source: 'orders',
      message_source: 'messages',
      send_action: 'send_message',
      mark_read_action: 'mark_read',
    }];
    page.actions = [
      {
        id: 'send_message',
        type: 'server',
        action: 'chat.messages.send',
        params: { content: '{row.content}' },
        refresh: ['messages'],
      },
      {
        id: 'mark_read',
        type: 'server',
        action: 'chat.threads.mark_read',
        refresh: ['orders'],
      },
    ];

    expect(() => validatePageDefinition(page)).not.toThrow();
    page.components[0].message_source = 'missing';
    expect(() => validatePageDefinition(page)).toThrow(/unknown datasource "missing"/);
  });
});
