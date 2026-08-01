import { SignJWT, jwtVerify } from 'jose';
import type {
  AuthClaims,
  AuthEvent,
  AuthServiceProtocol,
  AuthenticationRequest,
  AuthenticationResult,
  SecurityContext,
  User,
} from '../lib/interfaces/auth.ts';
import { AuthRepository } from './repository.ts';

export class AuthService implements AuthServiceProtocol {
  private readonly listeners = new Set<(event: AuthEvent) => void | Promise<void>>();

  constructor(private readonly repository: AuthRepository, private readonly secret: Uint8Array) {}

  async login(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const user = await this.repository.findUserByEmail(request.email);
    if (!user) throw { status: 401, message: 'Invalid credentials' };
    if (user.enabled === false) throw { status: 403, message: 'Account is disabled' };

    let valid = false;
    if (!String(user.password_hash).startsWith('$')) {
      valid = request.password === user.password_hash;
      if (valid) await this.repository.updatePassword(user.id, await Bun.password.hash(request.password));
    } else {
      valid = await Bun.password.verify(request.password, user.password_hash);
    }
    if (!valid) throw { status: 401, message: 'Invalid credentials' };

    const roles = user.roles_csv ? String(user.roles_csv).split(',').filter(Boolean) : [];
    const permissions = await this.repository.permissions(user.id);
    await this.repository.recordLogin(user.id);
    const claims: AuthClaims = {
      sub: String(user.id), id: String(user.id), email: user.email, name: user.name,
      avatar_url: user.avatar_url, preferred_lang: user.preferred_lang,
      branch_id: user.branch_id || null, view_scope: user.view_scope || 'all',
      roles, branches: user.branch_id ? [String(user.branch_id)] : [], permissions,
      attributes: { department_id: user.department_id }, token_type: 'user',
    };
    const token = await new SignJWT(claims as any)
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(this.secret);
    await this.emit({ type: 'auth.login', user: claims, at: new Date().toISOString() });
    return { token, user: claims, token_type: 'Bearer', expires_in: 8 * 60 * 60 };
  }

  async logout(userId: string): Promise<void> {
    await this.emit({ type: 'auth.logout', subject: userId, at: new Date().toISOString() });
  }

  async getCurrentUser(request: Request): Promise<AuthClaims> {
    const header = request.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) throw { status: 401, message: 'Unauthorized' };
    const user = await this.introspect(header.slice(7));
    if (!user) throw { status: 401, message: 'Invalid or expired token' };
    return user;
  }

  async introspect(token: string): Promise<AuthClaims | null> {
    try {
      const result = await jwtVerify(token, this.secret);
      return result.payload as AuthClaims;
    } catch {
      return null;
    }
  }

  hasPermission(user: AuthClaims | User, permission: string): boolean {
    return user.roles.includes('admin') || user.attributes?.permissions?.includes(permission) === true
      || ('permissions' in user && user.permissions.includes(permission));
  }

  getSecurityContext(user: AuthClaims | User): SecurityContext {
    return {
      allowedBranches: 'branches' in user ? user.branches : [],
      permissions: 'permissions' in user ? user.permissions : [],
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const rows = await this.repository.getPasswordHash(userId);
    const stored = rows[0]?.password_hash;
    if (!stored) throw { status: 404, message: 'User not found' };
    const valid = String(stored).startsWith('$')
      ? await Bun.password.verify(currentPassword, stored)
      : currentPassword === stored;
    if (!valid) throw { status: 400, message: 'Current password incorrect' };
    await this.repository.updatePassword(userId, await Bun.password.hash(newPassword));
    await this.emit({ type: 'auth.password_changed', subject: userId, at: new Date().toISOString() });
  }

  subscribe(listener: (event: AuthEvent) => void | Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async emit(event: AuthEvent): Promise<void> {
    await Promise.all([...this.listeners].map((listener) => listener(event)));
  }
}
