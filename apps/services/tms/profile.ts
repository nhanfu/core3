import type { TmsRouteContext } from './api-route-context.ts';

export async function handleProfileRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, pageCacheHeaders, prefetchedPageConfig,
  } = ctx;

  // ── PROFILE (self-update) ─────────────────────────────────────────────────
  if (pathname === '/api/v1/profile' && method === 'GET') {
    const profile = await repository.getProfile(authUser.sub);
    if (!profile) return apiError(404, 'User not found');

    return json(profile);
  }

  if (pathname === '/api/v1/company' && method === 'GET') {
    const company = await repository.getCompanyProfile();
    if (!company) return apiError(404, 'Company profile not found');
    return json(company);
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

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (pathname === '/api/v1/notifications' && method === 'GET') {
    return json(await repository.listNotifications(authUser.sub));
  }

  if (pathname === '/api/v1/notifications' && method === 'POST') {
    const body = await req.json() as any;
    const created = await repository.createNotification({
      user_id: body.user_id || authUser.sub,
      type: body.type,
      title: body.title,
      body: body.body || null,
      target_path: body.target_path || null,
    });
    return json(created, 201);
  }

  if (pathname === '/api/v1/notifications/read-all' && method === 'PATCH') {
    await repository.markAllNotificationsRead(authUser.sub);
    return json({ ok: true });
  }

  const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    await repository.markNotificationRead(notifReadMatch[1], authUser.sub);
    return json({ ok: true });
  }


  return null;
}
