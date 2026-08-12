// Authentication and authorization contracts.
// The framework defines these interfaces; the host application provides the implementation.

// ─── Domain types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  /** Role slugs, e.g. ['admin', 'fleet_manager'] */
  roles: string[];
  /** Branch IDs the user is allowed to see (for row-level filtering) */
  branches: string[];
  /** Arbitrary extra attributes exposed to scripts via ctx.user */
  attributes?: Record<string, unknown>;
}

export interface SecurityContext {
  /** Injected as :allowed_branches in every SQL query */
  allowedBranches: string[];
  /** Full permission set for the current user, used by hasPermission() */
  permissions: string[];
}

/** Stable identity exchanged between the host, modules, and external clients. */
export interface AuthIdentity extends User {
  sub: string;
  enabled?: boolean;
  preferred_lang?: string;
  branch_id?: string | null;
  view_scope?: 'all' | 'branch' | 'own' | string;
  permissions: string[];
}

export interface AuthClaims extends AuthIdentity {
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  token_type?: 'user' | 'service';
}

export interface AuthenticationRequest {
  email: string;
  password: string;
  client_id?: string;
  ip?: string;
  user_agent?: string;
}

export interface AuthenticationResult {
  token: string;
  user: AuthClaims;
  token_type?: 'Bearer';
  expires_in?: number;
}

export interface AuthServiceProtocol {
  login(request: AuthenticationRequest): Promise<AuthenticationResult>;
  loginExternal(profile: { email: string; name?: string; avatar_url?: string | null }): Promise<AuthenticationResult>;
  logout(userId: string): Promise<void>;
  getCurrentUser(request: Request | unknown): Promise<AuthClaims>;
  hasPermission(user: AuthClaims | User, permission: string): boolean;
  getSecurityContext(user: AuthClaims | User): SecurityContext;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  introspect(token: string): Promise<AuthClaims | null>;
}

/** Host/module protocol for authentication events and service-to-service calls. */
export interface AuthModuleProtocol {
  readonly service: AuthServiceProtocol;
  authenticate(request: Request): Promise<AuthClaims>;
  authorize(user: AuthClaims, permission: string): void;
  subscribe(listener: (event: AuthEvent) => void | Promise<void>): () => void;
}

/** Adapter contract for external OAuth/OIDC, SAML, LDAP, or gateway providers. */
export interface ExternalAuthProvider {
  readonly id: string;
  authenticate(request: Request): Promise<AuthenticationResult | null>;
  callback?(request: Request): Promise<AuthenticationResult | null>;
  validateConfiguration(): void;
}

/** Protocol used by API gateways and third-party applications to validate tokens. */
export interface TokenIntrospectionProtocol {
  introspect(token: string, clientId?: string, clientSecret?: string): Promise<{
    active: boolean;
    subject?: string;
    claims?: AuthClaims;
    expires_at?: number;
  }>;
}

/** Protocol for module-to-module and service-to-service authentication. */
export interface ServiceIdentityProtocol {
  issue(serviceId: string, audience: string[], expiresInSeconds?: number): Promise<string>;
  verify(token: string, audience: string): Promise<AuthClaims>;
}

export type AuthEvent =
  | { type: 'auth.login'; user: AuthClaims; at: string }
  | { type: 'auth.logout'; subject: string; at: string }
  | { type: 'auth.password_changed'; subject: string; at: string };

export const AUTH_SERVICE_KEY = 'auth';

// ─── Auth provider interface ─────────────────────────────────────────────────

/**
 * Pluggable auth provider.
 * The framework calls these methods before every datasource fetch and action.
 *
 * Example implementations:
 *   - JwtAuthProvider      (decode + verify JWT, load user from DB)
 *   - OAuth2AuthProvider   (introspect token, load profile)
 *   - SamlAuthProvider
 *   - LdapAuthProvider
 *   - MockAuthProvider     (for tests and demos)
 */
export interface IAuthProvider {
  /** Return the current user from the request context, or null if unauthenticated. */
  getCurrentUser(request?: unknown): Promise<User | null>;

  /**
   * Return true if the user holds the given permission string.
   * Permission strings are dot-separated: 'fleet.read', 'fleet.trucks.manage'
   */
  hasPermission(user: User, permission: string): boolean;

  /**
   * Build the SecurityContext used to inject row-level values into SQL.
   * Called once per request, result cached for the request lifetime.
   */
  getSecurityContext(user: User): SecurityContext;
}

// ─── Framework auth hooks ─────────────────────────────────────────────────────

/**
 * Applied before a datasource query runs.
 * Throws 401 / 403 if the check fails (framework catches and returns the right HTTP status).
 */
export interface DatasourceAuthGate {
  /**
   * Verify the user holds at least one of the declared roles AND the required permission.
   * Called by the framework — not by application code.
   */
  check(
    user: User,
    gate: { roles: string[]; permission: string },
    auth: IAuthProvider,
  ): Promise<void>;
}

// ─── Page-level auth block (YAML) ────────────────────────────────────────────

export interface PageAuthConfig {
  /** Permissions required to view the page at all */
  require: string[];
  /**
   * Name of a User field used for row-level filtering.
   * Maps to :allowed_branches (or a custom column) in SQL queries.
   */
  row_filter?: string;
}

// ─── Mock auth provider (for demos and tests) ────────────────────────────────

export class MockAuthProvider implements IAuthProvider {
  constructor(private user: User) {}

  async getCurrentUser(): Promise<User> {
    return this.user;
  }

  hasPermission(user: User, permission: string): boolean {
    // In demos: all permissions granted to admin role
    return user.roles.includes('admin') || user.roles.includes(permission.split('.')[0]);
  }

  getSecurityContext(user: User): SecurityContext {
    return {
      allowedBranches: user.branches,
      permissions: user.roles.flatMap(r => [`${r}.*`, `${r}.read`]),
    };
  }
}
