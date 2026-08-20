import type {
  AuthClaims,
  AuthEvent,
  AuthServiceProtocol,
  AuthenticationRequest,
  AuthenticationResult,
  SecurityContext,
  User,
} from './interfaces.ts';
import { AuthRepository } from './auth-repository.ts';
import { signAuthJwt, verifyAuthJwt } from '@core3/server/auth/jwt';

export class AuthService implements AuthServiceProtocol {
  private readonly listeners = new Set<(event: AuthEvent) => void | Promise<void>>();
  private readonly permissionCatalog: string[];

  constructor(private readonly repository: AuthRepository, private readonly secret: Uint8Array, permissionCatalog: string[] = []) {
    this.permissionCatalog = [...new Set(permissionCatalog)].sort();
  }

  async login(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const user = await this.repository.findUserByEmail(request.email);
    if (!user) throw { status: 401, code: 'INVALID_CREDENTIALS', message_key: 'auth.invalid_credentials', message: 'Invalid credentials' };
    if (user.enabled === false) throw { status: 403, code: 'ACCOUNT_DISABLED', message_key: 'auth.account_disabled', message: 'Account is disabled' };

    let valid = false;
    if (!String(user.password_hash).startsWith('$')) {
      valid = request.password === user.password_hash;
      if (valid) await this.repository.updatePassword(user.id, await Bun.password.hash(request.password));
    } else {
      valid = await Bun.password.verify(request.password, user.password_hash);
    }
    if (!valid) throw { status: 401, code: 'INVALID_CREDENTIALS', message_key: 'auth.invalid_credentials', message: 'Invalid credentials' };

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
    const company = user.current_company_id ? await this.repository.companyForUser(String(user.id), String(user.current_company_id)) : null;
    const companies = await this.repository.companiesForUser(String(user.id));
    (claims as any).company_id = user.current_company_id || null;
    (claims as any).company = company;
    (claims as any).companies = companies;
    // Keep profile media out of the JWT. Data URLs can be large and make the
    // Authorization header unreliable; avatar_url is loaded from Auth storage.
    const { avatar_url: _avatarUrl, ...tokenClaims } = claims;
    const token = await signAuthJwt(tokenClaims as any, this.secret);
    await this.emit({ type: 'auth.login', user: claims, at: new Date().toISOString() });
    return { token, user: claims, token_type: 'Bearer', expires_in: 8 * 60 * 60 };
  }

  async logout(userId: string): Promise<void> {
    await this.emit({ type: 'auth.logout', subject: userId, at: new Date().toISOString() });
  }

  async getCurrentUser(request: Request): Promise<AuthClaims> {
    const header = request.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) throw { status: 401, code: 'UNAUTHORIZED', message_key: 'errors.unauthorized', message: 'Unauthorized' };
    const user = await this.introspect(header.slice(7));
    if (!user) throw { status: 401, code: 'INVALID_TOKEN', message_key: 'auth.invalid_token', message: 'Invalid or expired token' };
    const access = user.email ? await this.repository.findUserByEmail(String(user.email)) : null;
    const profile = await this.repository.profile(String(user.sub));
    if (!profile) return user;
    const company = profile.current_company_id ? await this.repository.companyForUser(String(user.sub), String(profile.current_company_id)) : null;
    const roles = access?.roles_csv ? String(access.roles_csv).split(',').filter(Boolean) : user.roles;
    const permissions = access ? await this.repository.permissions(String(user.sub)) : user.permissions;
    return { ...user, roles, permissions, view_scope: access?.view_scope || user.view_scope, avatar_url: profile.avatar_url || null, company_id: profile.current_company_id || null, company } as any;
  }

  async introspect(token: string): Promise<AuthClaims | null> {
    try {
      return await verifyAuthJwt<AuthClaims>(token, this.secret);
    } catch { return null; }
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
    if (!stored) throw { status: 404, code: 'NOT_FOUND', message_key: 'errors.not_found', message: 'User not found' };
    const valid = String(stored).startsWith('$')
      ? await Bun.password.verify(currentPassword, stored)
      : currentPassword === stored;
    if (!valid) throw { status: 400, code: 'INVALID_PASSWORD', message_key: 'auth.invalid_current_password', message: 'Current password incorrect' };
    await this.repository.updatePassword(userId, await Bun.password.hash(newPassword));
    await this.emit({ type: 'auth.password_changed', subject: userId, at: new Date().toISOString() });
  }

  async call(operation: string, request: Record<string, any> = {}): Promise<any> {
    switch (operation) {
      case 'users.resolve':
        return { users: await this.repository.userSummariesByIds((request.user_ids || []).map(String)) };
      case 'users.resolve_emails': {
        const emails = String(request.emails || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
        const users = await this.repository.userSummariesByEmails(emails);
        if (users.length !== new Set(emails).size) return null;
        return { users, user_ids_csv: users.map((user) => String(user.id)).join(',') };
      }
      case 'users.search':
        return { users: await this.repository.userSearch(request.query == null ? null : String(request.query), request.branch_id == null ? null : String(request.branch_id), String(request.view_scope || 'all'), Number(request.limit || 100)) };
      case 'users.validate':
        return this.repository.userValidate(String(request.user_id || ''), request.branch_id == null ? null : String(request.branch_id), String(request.view_scope || 'all'));
      case 'users.manage':
        return { users: await this.repository.usersManage(request.query == null ? null : String(request.query), Number(request.limit || 100)) };
      case 'roles.manage':
        return { data: await this.repository.rolesManage(request.query == null ? null : String(request.query)) };
      case 'roles.permissions': {
        const selected = new Set(await this.repository.rolePermissions(String(request.role_id || request.id || '')));
        return { data: this.permissionCatalog.map((permission) => ({
          value: permission,
          label: permission,
          group: permission.split('.')[0] || 'general',
          enabled: selected.has(permission),
        })) };
      }
      case 'users.update':
        return this.repository.updateManagedUser(request);
      case 'roles.update':
        return this.repository.updateManagedRole({
          ...request,
          ...(Array.isArray(request.permissions)
            ? { permissions: request.permissions.map(String).filter((permission: string) => this.permissionCatalog.includes(permission)) }
            : {}),
        });
      case 'companies.list':
        return { companies: await this.repository.companiesForUser(String(request.user_id || '')) };
      default:
        throw new Error(`Unknown auth service operation: ${operation}`);
    }
  }

  subscribe(listener: (event: AuthEvent) => void | Promise<void>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async emit(event: AuthEvent): Promise<void> {
    await Promise.all([...this.listeners].map((listener) => listener(event)));
  }
}
