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
/**
 * Applied before a datasource query runs.
 * Throws 401 / 403 if the check fails (framework catches and returns the right HTTP status).
 */
export interface DatasourceAuthGate {
    /**
     * Verify the user holds at least one of the declared roles AND the required permission.
     * Called by the framework — not by application code.
     */
    check(user: User, gate: {
        roles: string[];
        permission: string;
    }, auth: IAuthProvider): Promise<void>;
}
export interface PageAuthConfig {
    /** Permissions required to view the page at all */
    require: string[];
    /**
     * Name of a User field used for row-level filtering.
     * Maps to :allowed_branches (or a custom column) in SQL queries.
     */
    row_filter?: string;
}
export declare class MockAuthProvider implements IAuthProvider {
    private user;
    constructor(user: User);
    getCurrentUser(): Promise<User>;
    hasPermission(user: User, permission: string): boolean;
    getSecurityContext(user: User): SecurityContext;
}
