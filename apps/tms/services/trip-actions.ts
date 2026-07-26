export const TRIP_ACTION_REGISTRY: Record<string, { operation: 'cancel'; permission: string }> = {
  'trips.cancel': { operation: 'cancel', permission: 'trips.write' },
};
