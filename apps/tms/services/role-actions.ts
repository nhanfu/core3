export const ROLE_ACTION_REGISTRY: Record<string, { operation: 'grant' | 'revoke'; permission: string }> = {
  'settings.roles.grant_permission': { operation: 'grant', permission: 'settings.write' },
  'settings.roles.revoke_permission': { operation: 'revoke', permission: 'settings.write' },
};
