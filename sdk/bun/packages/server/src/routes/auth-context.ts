/**
 * Return the company name selected by the authenticated session.
 *
 * Company scope is identity-derived.  In particular, callers must not be
 * allowed to replace this value with a query parameter.  The fallbacks cover
 * the claims exposed by the auth adapter as well as session-shaped users used
 * by host integrations during a company switch.
 */
export function authenticatedCompanyName(user: any): string {
  const direct = [
    user?.company?.name,
    user?.current_company_name,
    user?.company_name,
  ].find((value) => typeof value === 'string' && value.trim());
  if (direct) return String(direct).trim();

  const companyId = String(user?.company_id || user?.current_company_id || '').trim();
  if (!companyId || !Array.isArray(user?.companies)) return '';
  const selected = user.companies.find((company: any) => String(company?.id || '') === companyId);
  return typeof selected?.name === 'string' ? selected.name.trim() : '';
}
