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
        permission: 'orders.write',
        title: 'Add order',
        table: 'orders',
        operation: 'insert',
        refresh: ['orders'],
        fields: [{ field: 'code', label: 'Code', type: 'text', required: true }],
      },
      {
        id: 'edit_order',
        type: 'form',
        permission: 'orders.write',
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

  it('accepts the opt-in Odoo ListView contract and validates action references', () => {
    const page = validPage() as any;
    page.components = [{
      type: 'ListView',
      variant: 'odoo',
      source: 'orders',
      create_action: 'add_order',
      row_open_action: 'edit_order',
      row_actions: 'menu',
      views: [
        { id: 'list', label: 'List' },
        { id: 'card', label: 'Cards', icon: 'grid', card: { title: 'code' } },
        { id: 'kanban', label: 'Kanban', group_by: 'status', card: { title: 'code' } },
        { id: 'calendar', label: 'Calendar', date_field: 'order_date', card: { title: 'code' } },
        { id: 'form', label: 'Form', icon: 'form' },
      ],
      form_view: { page: 'order-detail.yaml', side_panel: true },
      filters: [{ field: 'status', label: 'Status', options: ['Draft'] }],
      group_by: [{ field: 'status', label: 'Status' }],
      columns: [{ field: 'code', label: 'Code', optional: 'show' }],
    }];
    expect(() => validatePageDefinition(page)).not.toThrow();

    page.components[0].row_open_action = 'missing_action';
    expect(() => validatePageDefinition(page)).toThrow(/references unknown action "missing_action"/);
  });

  it('validates datasource-backed toolbar filter references', () => {
    const page = validPage() as any;
    page.components = [{
      type: 'ListToolbar',
      source: 'orders',
      filters: [{ field: 'status', label: 'Status', options_source: 'missing_source' }],
    }];

    expect(() => validatePageDefinition(page)).toThrow(/unknown datasource "missing_source"/);
  });

  it('validates datasource-backed legacy filter references', () => {
    const page = validPage() as any;
    page.filters = {
      source: 'orders',
      fields: [{ field: 'status', label: 'Status', type: 'select', options_source: 'missing_source' }],
    };

    expect(() => validatePageDefinition(page)).toThrow(/unknown datasource "missing_source"/);
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
    page.components = [];
    page.components = [
      {
        type: 'DocumentSummary',
        source: 'orders',
        title_field: 'code',
        status_field: 'status',
        columns: [{ field: 'customer', label: 'Customer' }],
      },
      {
        type: 'OdooFormView',
        source: 'orders',
        title_field: 'code',
        status_field: 'status',
        message_source: 'orders',
        follower_source: 'orders',
        follower_candidates_source: 'orders',
        attachment_source: 'orders',
        message_action: 'add_line',
        note_action: 'add_line',
        follower_add_action: 'add_line',
        follower_remove_action: 'add_line',
        attachment_upload_action: 'add_line',
        attachment_download_action: 'add_line',
        fields: [{ field: 'customer', label: 'Customer' }],
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
      permission: 'orders.write',
      title: 'Add line',
      action: 'orders.lines.create',
      params: { id: '{state.id}' },
      refresh: ['orders'],
      fields: [{ field: 'description', label: 'Description', type: 'text', required: true }],
    }];

    expect(() => validatePageDefinition(page)).not.toThrow();
  });

  it('accepts rich-text fields with declarative template tokens', () => {
    const page = validPage() as any;
    page.toolbar = [];
    page.components = [];
    page.actions = [{
      id: 'edit_template',
      type: 'form',
      permission: 'system.write',
      title: 'Edit template',
      table: 'print_template_blocks',
      operation: 'update',
      fields: [{
        field: 'content',
        label: 'Content',
        type: 'richtext',
        tokens: ['order.order_number', 'order.route'],
      }],
    }];

    expect(() => validatePageDefinition(page)).not.toThrow();
  });

  it('accepts semantic chart colors and rejects raw visual values', () => {
    const page = validPage() as any;
    page.components = [{ type: 'Chart', source: 'orders', color: 'teal', series: [{ field: 'amount', label: 'Amount', color: 'blue' }] }];
    expect(() => validatePageDefinition(page)).not.toThrow();

    page.components[0].color = '#2563eb';
    expect(() => validatePageDefinition(page)).toThrow(/semantic chart color/);
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
      permission: 'orders.write',
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
    page.datasources.push({
      id: 'attachments',
      permission: 'chat.read',
      query: 'SELECT id, message_id FROM chat_attachments',
    });
    page.toolbar = [];
    page.components = [{
      type: 'ChatWorkspace',
      source: 'orders',
      message_source: 'messages',
      attachment_source: 'attachments',
      send_action: 'send_message',
      upload_action: 'upload_attachment',
      download_action: 'download_attachment',
      mark_read_action: 'mark_read',
    }];
    page.actions = [
      {
        id: 'send_message',
        type: 'server',
        permission: 'chat.write',
        action: 'chat.messages.send',
        params: { content: '{row.content}' },
        refresh: ['messages'],
      },
      {
        id: 'mark_read',
        type: 'server',
        permission: 'chat.read',
        action: 'chat.threads.mark_read',
        refresh: ['orders'],
      },
      {
        id: 'upload_attachment',
        type: 'upload',
        permission: 'chat.write',
        kind: 'chat_attachment',
        refresh: ['messages', 'attachments'],
      },
      {
        id: 'download_attachment',
        type: 'download',
        permission: 'chat.read',
        kind: 'chat_attachment',
      },
    ];

    expect(() => validatePageDefinition(page)).not.toThrow();
    page.components[0].message_source = 'missing';
    expect(() => validatePageDefinition(page)).toThrow(/unknown datasource "missing"/);
  });

  it('requires permissions on mutating action definitions', () => {
    const page = validPage() as any;
    delete page.actions[0].permission;

    expect(() => validatePageDefinition(page)).toThrow(/actions\[0\]\.permission must be a non-empty string/);
  });
});
