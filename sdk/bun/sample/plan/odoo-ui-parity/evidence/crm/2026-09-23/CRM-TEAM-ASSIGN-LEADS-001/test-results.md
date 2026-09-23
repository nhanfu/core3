# Test results

- Focused: `bun test test/crm_team_assign_leads.integration.test.ts` — **2
  passed, 13 assertions**.
- Covered: page/API discovery and binding, exact action permission, stable seed
  replay, two-member round-robin assignment, lead-to-opportunity conversion,
  missing/archived team guards, and file-backed restart persistence.
- Scoped formatting: `git diff --check -- sdk/bun/sample/services/crm
  sdk/bun/sample/test/crm_team_assign_leads.integration.test.ts` — passed.
- Related CRM lifecycle: `bun test test/crm.integration.test.ts` — **45 passed,
  1 failed, 237 assertions**. The existing AI action-catalog invariant reports
  this new `crm.teams.assign_leads` action alongside older CRM actions missing
  from `services/ai/agent.yaml`; that infrastructure file is outside the
  requested CRM-only write scope and was not changed.
- Discovery audit: `bun run audit` — passed, **866 pages, 874 routes, 1,837
  datasources**.
- No unrelated module files were changed by this CRM slice.
