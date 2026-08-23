import type { AuthClaims, AuthIdentity, AuthServiceProtocol, SecurityContext, User } from './interfaces.ts';
import { AuthJwtKeyRing, verifyAuthJwt } from '@core3/server/auth/jwt';

export class DirectAuthAdapter implements AuthServiceProtocol {
  constructor(private readonly service: AuthServiceProtocol) {}

  async login(): Promise<never> {
    throw new Error('Login must be handled by the Auth module HTTP endpoint');
  }

  async logout(userId: string): Promise<void> { return this.service.logout(userId); }

  async getCurrentUser(request: Request | unknown): Promise<AuthClaims> {
    return this.service.getCurrentUser(request);
  }

  async introspect(token: string): Promise<AuthClaims | null> {
    return this.service.introspect(token);
  }

  hasPermission(user: AuthClaims | User, permission: string): boolean {
    return this.service.hasPermission(user, permission);
  }

  getSecurityContext(user: AuthClaims | User): SecurityContext {
    return this.service.getSecurityContext(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.service.changePassword(userId, currentPassword, newPassword);
  }
}

export type AuthAdapter = AuthServiceProtocol & {
  getCurrentUser(request: Request): Promise<AuthIdentity>;
};
