export type CurrencyActionDefinition = {
  permission: string;
  operation: 'sync_rates';
};

export const CURRENCY_ACTION_REGISTRY: Record<string, CurrencyActionDefinition> = {
  'catalog.currencies.sync_rates': { permission: 'catalog.write', operation: 'sync_rates' },
};
