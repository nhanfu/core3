import type { AuthClaims } from './interfaces.ts';
import type { TopicDefinition } from '../../lib/topics/contracts.ts';

export type AuthResolveRequest = { token: string };
export type AuthResolveResponse = AuthClaims | null;
export const AUTH_USER_RESOLVE: TopicDefinition<AuthResolveRequest, AuthResolveResponse> = {
  topic: 'auth.user.resolve',
  version: 1,
  kind: 'query',
};

export type AuthPermissionRequest = { user: AuthClaims; permission: string };
export type AuthPermissionResponse = { allowed: boolean };
export const AUTH_PERMISSION_CHECK: TopicDefinition<AuthPermissionRequest, AuthPermissionResponse> = {
  topic: 'auth.permission.check',
  version: 1,
  kind: 'query',
};

export type AuthPasswordChangeRequest = { userId: string; currentPassword: string; newPassword: string };
export type AuthPasswordChangeResponse = { ok: true };
export const AUTH_PASSWORD_CHANGE: TopicDefinition<AuthPasswordChangeRequest, AuthPasswordChangeResponse> = {
  topic: 'auth.password.change',
  version: 1,
  kind: 'command',
};
