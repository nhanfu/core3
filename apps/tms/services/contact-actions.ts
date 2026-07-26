export type ContactDomain = 'customer' | 'partner' | 'crm';
export type ContactOperation = 'create' | 'update' | 'delete';

export type ContactActionDefinition = {
  domain: ContactDomain;
  operation: ContactOperation;
  permission: string;
};

export const CONTACT_ACTION_REGISTRY: Record<string, ContactActionDefinition> = {
  'crm.contacts.create': { domain: 'crm', operation: 'create', permission: 'crm.write' },
  'crm.contacts.update': { domain: 'crm', operation: 'update', permission: 'crm.write' },
  'crm.contacts.delete': { domain: 'crm', operation: 'delete', permission: 'crm.write' },
  'customers.contacts.create': { domain: 'customer', operation: 'create', permission: 'crm.write' },
  'customers.contacts.update': { domain: 'customer', operation: 'update', permission: 'crm.write' },
  'customers.contacts.delete': { domain: 'customer', operation: 'delete', permission: 'crm.write' },
  'partners.contacts.create': { domain: 'partner', operation: 'create', permission: 'crm.write' },
  'partners.contacts.update': { domain: 'partner', operation: 'update', permission: 'crm.write' },
  'partners.contacts.delete': { domain: 'partner', operation: 'delete', permission: 'crm.write' },
};
