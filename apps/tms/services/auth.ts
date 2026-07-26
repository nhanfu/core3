import { SignJWT, jwtVerify } from 'jose';

export class JwtAuthProvider {
  secret: Uint8Array;

  constructor(secret: Uint8Array) {
    this.secret = secret;
  }

  sign(payload: any) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(this.secret);
  }

  async login(email: string, password: string, repository: any) {
    const user = await repository.getLoginUserByEmail(email);
    if (!user) throw { status: 401, message: 'Invalid credentials' };
    if (user.enabled === false) throw { status: 403, message: 'Account is disabled' };

    let valid = false;
    if (!user.password_hash.startsWith('$')) {
      valid = password === user.password_hash;
      if (valid) {
        const hash = await Bun.password.hash(password);
        await repository.refreshUserPasswordHash(user.id, hash);
        user.password_hash = hash;
      }
    } else {
      valid = await Bun.password.verify(password, user.password_hash);
    }
    if (!valid) throw { status: 401, message: 'Invalid credentials' };

    const roles = user.roles_csv ? user.roles_csv.split(',').filter(Boolean) : [];
    const permissions = await repository.getUserPermissions(user.id);
    await repository.recordUserLogin(user.id);
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      preferred_lang: user.preferred_lang,
      branch_id: user.branch_id || null,
      view_scope: user.view_scope || 'all',
      roles,
      permissions,
    };
    const token = await this.sign(tokenPayload);
    return { token, user: tokenPayload };
  }

  async changePassword(userId: any, currentPassword: string, newPassword: string, repository: any) {
    const stored = await repository.getUserPasswordHash(userId);
    if (!stored) throw { status: 404, message: 'User not found' };
    let currentValid = false;
    if (!stored.startsWith('$')) {
      currentValid = currentPassword === stored;
    } else {
      currentValid = await Bun.password.verify(currentPassword, stored);
    }
    if (!currentValid) throw { status: 400, message: 'Current password incorrect' };
    const hash = await Bun.password.hash(newPassword);
    await repository.refreshUserPasswordHash(userId, hash);
    return true;
  }

  async getCurrentUser(request: Request) {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) throw { status: 401, message: 'Unauthorized' };
    try {
      const { payload } = await jwtVerify(auth.slice(7), this.secret);
      return payload;
    } catch {
      throw { status: 401, message: 'Invalid or expired token' };
    }
  }

  hasPermission(user: any, permission: string) {
    return user.permissions?.includes(permission) || false;
  }

  getSecurityContext(user: any) {
    return { allowedBranches: user.branches || [], permissions: user.permissions || [] };
  }
}
