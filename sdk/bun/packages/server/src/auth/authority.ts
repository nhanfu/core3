import { DispatchSigningKeyRing, type DispatchClaims } from './dispatch.ts';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

export type AuthSession = { userId: string; deviceId: string; sessionId: string; userSecurityRevision: number; sessionRevision: number; authzVersion: number; expiresAt: number; createdAt?: number; revoked?: boolean };
export type DispatchRequest = { subject?: string; userId?: string; deviceId?: string; sessionId?: string; parentJti?: string; sourceService: string; targetService: string; commandClass: string; requiredPermission?: string; permissions: string[]; correlationId?: string; causationId?: string };
export type PermissionResolver = (request: DispatchRequest) => Promise<string[]> | string[];
type DispatchKeyProvider = { issue(claims: Omit<DispatchClaims, 'token_type' | 'dispatch_id'>, expiresInSeconds?: number): Promise<string>; verify<T extends DispatchClaims>(token: string, audience: string, expected?: Partial<Pick<DispatchClaims, 'source_service' | 'command_class'>>): Promise<T>; jwks(): Promise<{ keys: Record<string, unknown>[] }> };

export class DispatchAuthority {
  private readonly sessions = new Map<string, AuthSession>();
  private readonly denied = new Map<string, number>();
  private readonly userRevokedAt = new Map<string, number>();
  private readonly authorizationVersions = new Map<string, number>();
  private globalAuthorizationVersion = 0;
  private readonly policies = new Map<string, string | undefined>();
  private readonly keyRingPromise: Promise<DispatchKeyProvider>;
  constructor(private readonly now: () => number = Date.now, keyRing?: Promise<DispatchKeyProvider>, private readonly resolvePermissions?: PermissionResolver, private readonly statePath?: string) { this.keyRingPromise = keyRing || DispatchSigningKeyRing.create(); this.loadState(); }
  registerSession(session: AuthSession): void { this.sessions.set(session.sessionId, { ...session, createdAt: session.createdAt || this.now() }); this.persistState(); }
  allow(sourceService: string, targetService: string, commandClass: string, requiredPermission?: string): void { this.policies.set(`${sourceService}:${targetService}:${commandClass}`, requiredPermission); }
  authorizationVersion(userId: string): number { return Math.max(this.globalAuthorizationVersion, this.authorizationVersions.get(userId) || 0); }
  bumpAuthorization(userId?: string): number { if (userId) this.authorizationVersions.set(userId, this.authorizationVersion(userId) + 1); else this.globalAuthorizationVersion += 1; this.persistState(); return userId ? this.authorizationVersion(userId) : this.globalAuthorizationVersion; }
  revokeSession(sessionId: string, until = this.now() + 8 * 60 * 60 * 1000): void { const session = this.sessions.get(sessionId); if (session) this.sessions.set(sessionId, { ...session, revoked: true, sessionRevision: session.sessionRevision + 1 }); this.denied.set(`session:${sessionId}`, until); this.persistState(); }
  revokeUser(userId: string, until = this.now() + 8 * 60 * 60 * 1000): void { const revokedAt = this.now(); for (const session of this.sessions.values()) if (session.userId === userId) session.revoked = true; this.userRevokedAt.set(userId, revokedAt); this.denied.set(`user:${userId}`, until); this.persistState(); }
  isActive(session: AuthSession): boolean { const now = this.now(); if (session.revoked || session.expiresAt <= now) return false; const deniedSessionUntil = this.denied.get(`session:${session.sessionId}`) || 0; const revokedAt = this.userRevokedAt.get(session.userId) || 0; return deniedSessionUntil <= now && revokedAt <= (session.createdAt || now); }
  sessionStatus(sessionId: string, userId?: string): boolean | undefined { const session = this.sessions.get(sessionId); if (!session || (userId && session.userId !== userId)) return undefined; return this.isActive(session); }
  async issue(request: DispatchRequest, expiresInSeconds = 60): Promise<string> {
    const policyPermission = this.policies.get(`${request.sourceService}:${request.targetService}:${request.commandClass}`);
    if (!this.policies.has(`${request.sourceService}:${request.targetService}:${request.commandClass}`)) throw Object.assign(new Error('Service communication policy denied'), { code: 'POLICY_DENIED', status: 403 });
    const session = request.sessionId ? this.sessions.get(request.sessionId) : undefined;
    if (request.sessionId && (!session || !this.isActive(session))) throw Object.assign(new Error('Session is revoked or expired'), { code: 'SESSION_REVOKED', status: 401 });
    const keyRing = await this.keyRingPromise;
    const permissions = this.resolvePermissions ? await this.resolvePermissions(request) : request.permissions;
    const requiredPermission = request.requiredPermission || policyPermission;
    if (requiredPermission && !permissions.includes('*') && !permissions.includes(requiredPermission)) throw Object.assign(new Error('Permission denied'), { code: 'PERMISSION_DENIED', status: 403 });
    const authzVersion = request.subject ? this.authorizationVersion(String(request.subject)) : (session?.authzVersion || 0);
    const claims: Omit<DispatchClaims, 'token_type' | 'dispatch_id'> = { sub: request.subject, sid: request.sessionId, did: request.deviceId, parent_jti: request.parentJti, aud: request.targetService, source_service: request.sourceService, command_class: request.commandClass, permissions: [...new Set(permissions)].sort(), authz_version: authzVersion, user_security_revision: session?.userSecurityRevision, session_revision: session?.sessionRevision, correlation_id: request.correlationId, causation_id: request.causationId };
    return keyRing.issue(claims, expiresInSeconds);
  }
  async verify(token: string, audience: string, expected?: Partial<Pick<DispatchClaims, 'source_service' | 'command_class'>>): Promise<DispatchClaims> { return (await this.keyRingPromise).verify(token, audience, expected); }
  async jwks(): Promise<{ keys: Record<string, unknown>[] }> { return (await this.keyRingPromise).jwks(); }
  private loadState(): void { if (!this.statePath) return; try { const state = JSON.parse(readFileSync(this.statePath, 'utf8')) as { sessions?: AuthSession[]; denied?: Array<[string, number]>; userRevokedAt?: Array<[string, number]>; authorizationVersions?: Array<[string, number]>; globalAuthorizationVersion?: number }; for (const session of state.sessions || []) this.sessions.set(session.sessionId, session); for (const [key, expiry] of state.denied || []) this.denied.set(key, expiry); for (const [userId, revokedAt] of state.userRevokedAt || []) this.userRevokedAt.set(userId, revokedAt); for (const [userId, version] of state.authorizationVersions || []) this.authorizationVersions.set(userId, version); this.globalAuthorizationVersion = Number(state.globalAuthorizationVersion || 0); } catch { /* first start or incomplete temp file */ } }
  private persistState(): void { if (!this.statePath) return; try { writeFileSync(`${this.statePath}.tmp`, JSON.stringify({ sessions: [...this.sessions.values()], denied: [...this.denied.entries()], userRevokedAt: [...this.userRevokedAt.entries()], authorizationVersions: [...this.authorizationVersions.entries()], globalAuthorizationVersion: this.globalAuthorizationVersion })); renameSync(`${this.statePath}.tmp`, this.statePath); } catch { /* durable DB remains authoritative in production */ } }
}
