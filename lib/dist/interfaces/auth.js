// @core3/backend — authentication & authorization contracts
// The framework defines these interfaces; the host application provides the implementation.
// ─── Mock auth provider (for demos and tests) ────────────────────────────────
export class MockAuthProvider {
    user;
    constructor(user) {
        this.user = user;
    }
    async getCurrentUser() {
        return this.user;
    }
    hasPermission(user, permission) {
        // In demos: all permissions granted to admin role
        return user.roles.includes('admin') || user.roles.includes(permission.split('.')[0]);
    }
    getSecurityContext(user) {
        return {
            allowedBranches: user.branches,
            permissions: user.roles.flatMap(r => [`${r}.*`, `${r}.read`]),
        };
    }
}
