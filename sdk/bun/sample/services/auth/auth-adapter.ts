import type { AuthClaims, AuthIdentity, AuthServiceProtocol, SecurityContext, User } from './interfaces.ts';
import { AUTH_PASSWORD_CHANGE } from './topics.ts';
import { TopicMediator } from '@core3/server/topics/mediator';
import { verifyAuthJwt } from '@core3/server/auth/jwt';

export class MediatorAuthAdapter implements AuthServiceProtocol {
  constructor(private readonly topics: TopicMediator, private readonly secret: Uint8Array) {}

  async login(): Promise<never> {
    throw new Error('Login must be handled by the Auth module HTTP endpoint');
  }

  async logout(userId: string): Promise<void> {
    void userId;
  }

  async getCurrentUser(request: Request | unknown): Promise<AuthClaims> {
    const header = authorizationHeader(request);
    if (!header.startsWith('Bearer ')) throw { status: 401, code: 'UNAUTHORIZED', message_key: 'errors.unauthorized', message: 'Unauthorized' };
    const user = await verifyAuthJwt<AuthClaims>(header.slice(7), this.secret);
    if (!user) throw { status: 401, code: 'INVALID_TOKEN', message_key: 'auth.invalid_token', message: 'Invalid or expired token' };
    return user;
  }

  async introspect(token: string): Promise<AuthClaims | null> {
    return verifyAuthJwt<AuthClaims>(token, this.secret);
  }

  hasPermission(user: AuthClaims | User, permission: string): boolean {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const permissions = 'permissions' in user && Array.isArray(user.permissions) ? user.permissions : [];
    const attributePermissions = Array.isArray(user.attributes?.permissions) ? user.attributes.permissions : [];
    return roles.includes('admin') || permissions.includes(permission) || attributePermissions.includes(permission);
  }

  getSecurityContext(user: AuthClaims | User): SecurityContext {
    return {
      allowedBranches: Array.isArray(user.branches) ? user.branches : [],
      permissions: 'permissions' in user && Array.isArray(user.permissions) ? user.permissions : [],
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.topics.request(AUTH_PASSWORD_CHANGE, { userId, currentPassword, newPassword });
  }
}

export type AuthAdapter = AuthServiceProtocol & {
  getCurrentUser(request: Request): Promise<AuthIdentity>;
};

function authorizationHeader(request: Request | unknown): string {
  if (!request || typeof request !== 'object' || !('headers' in request)) return '';
  const headers = request.headers;
  if (!headers || typeof headers !== 'object' || !('get' in headers) || typeof headers.get !== 'function') return '';
  return headers.get('Authorization') || '';
}
