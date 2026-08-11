
export async function handleProfileRoutes(ctx: Record<string, any>): Promise<Response | null> {
  const { req, pathname, method, repository, authProvider, authUser, json, apiError } = ctx;

  // ── PROFILE (self-update) ─────────────────────────────────────────────────
  if (pathname === '/api/v1/profile' && method === 'GET') {
    const profile = await repository.getProfile(authUser.sub);
    if (!profile) return apiError(404, 'User not found');

    return json(profile);
  }

  if (pathname === '/api/v1/profile' && method === 'PATCH') {
    const body = await req.json();
    const allowed = ['name', 'preferred_lang', 'avatar_url'];
    const fields  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (body.new_password) {
      if (!body.current_password) return apiError(400, 'current_password required');
      try {
        await authProvider.changePassword(String(authUser.sub), body.current_password, body.new_password);
    } catch (err) {
      const error = err as any;
      return apiError(error.status || 400, error.message || 'Password change failed');
      }
    }

    if (Object.keys(fields).length) {
      await repository.updateProfile(authUser.sub, fields);
    }
    return json({ ok: true });
  }

  return null;
}
