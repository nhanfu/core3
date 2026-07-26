export type LineItemDomain = 'order' | 'quote';
export type LineItemOperation = 'create' | 'update' | 'delete';

export type LineItemActionDefinition = {
  domain: LineItemDomain;
  operation: LineItemOperation;
  permission: string;
};

export const LINE_ITEM_ACTION_REGISTRY: Record<string, LineItemActionDefinition> = {
  'orders.lines.create': {
    domain: 'order',
    operation: 'create',
    permission: 'orders.write',
  },
  'orders.lines.update': {
    domain: 'order',
    operation: 'update',
    permission: 'orders.write',
  },
  'orders.lines.delete': {
    domain: 'order',
    operation: 'delete',
    permission: 'orders.write',
  },
  'quotes.lines.create': {
    domain: 'quote',
    operation: 'create',
    permission: 'crm.write',
  },
  'quotes.lines.update': {
    domain: 'quote',
    operation: 'update',
    permission: 'crm.write',
  },
  'quotes.lines.delete': {
    domain: 'quote',
    operation: 'delete',
    permission: 'crm.write',
  },
};
