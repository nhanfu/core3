import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const DEFAULT_AUTH_JWT_SECRET = 'core3-auth-dev-secret-32chars!!!!';

export function authJwtSecret(env: Record<string, string | undefined>): Uint8Array {
  return new TextEncoder().encode(env.AUTH_JWT_SECRET || env.JWT_SECRET || DEFAULT_AUTH_JWT_SECRET);
}

export async function signAuthJwt(claims: Record<string, unknown>, secret: Uint8Array): Promise<string> {
  return new SignJWT(claims as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAuthJwt<T extends object>(token: string, secret: Uint8Array): Promise<T | null> {
  try {
    const result = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return result.payload as T;
  } catch {
    return null;
  }
}
