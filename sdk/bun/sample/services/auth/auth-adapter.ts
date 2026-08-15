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
    const header = request instanceof Request ? request.headers.get('Authorization') || '' : '';
    if (!header.startsWith('Bearer ')) throw { status: 401, code: 'UNAUTHORIZED', message_key: 'errors.unauthorized', message: 'Unauthorized' };
    const user = await verifyAuthJwt<AuthClaims>(header.slice(7), this.secret);
    if (!user) throw { status: 401, code: 'INVALID_TOKEN', message_key: 'auth.invalid_token', message: 'Invalid or expired token' };
    return user;
  }

  async introspect(token: string): Promise<AuthClaims | null> {
    return verifyAuthJwt<AuthClaims>(token, this.secret);
  }

  hasPermission(user: AuthClaims | User, permission: string): boolean {
    return user.roles.includes('admin') || ('permissions' in user && user.permissions.includes(permission))
      || user.attributes?.permissions?.includes(permission) === true;
  }

  getSecurityContext(user: AuthClaims | User): SecurityContext {
    return { allowedBranches: 'branches' in user ? user.branches : [], permissions: 'permissions' in user ? user.permissions : [] };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.topics.request(AUTH_PASSWORD_CHANGE, { userId, currentPassword, newPassword });
  }
}

export type AuthAdapter = AuthServiceProtocol & {
  getCurrentUser(request: Request): Promise<AuthIdentity>;
};
