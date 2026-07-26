export const TRIP_ACTION_REGISTRY: Record<string, { operation: 'start' | 'complete' | 'cancel'; permission: string }> = {
  'trips.start': { operation: 'start', permission: 'trips.write' },
  'trips.complete': { operation: 'complete', permission: 'trips.write' },
  'trips.cancel': { operation: 'cancel', permission: 'trips.write' },
};
