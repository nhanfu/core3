import { SignJWT, jwtVerify } from 'jose';

export class DuckDbRepository {
  constructor(connection) {
    this.connection = connection;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.run(sql, ...params, (err) => (err ? reject(err) : resolve()));
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.all(sql, ...params, (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map(convertRow));
      });
    });
  }
}

export class JwtAuthProvider {
  constructor(secret) {
    this.secret = secret;
  }

  sign(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(this.secret);
  }

  async getCurrentUser(request) {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) throw { status: 401, message: 'Unauthorized' };
    try {
      const { payload } = await jwtVerify(auth.slice(7), this.secret);
      return payload;
    } catch {
      throw { status: 401, message: 'Invalid or expired token' };
    }
  }

  hasPermission(user, permission) {
    return user.permissions?.includes(permission) || false;
  }

  getSecurityContext(user) {
    return { allowedBranches: user.branches || [], permissions: user.permissions || [] };
  }
}

function convertRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? Number(value) : value instanceof Date ? value.toISOString() : value,
  ]));
}
