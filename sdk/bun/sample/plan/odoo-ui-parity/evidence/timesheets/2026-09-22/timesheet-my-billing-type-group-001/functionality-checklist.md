# Functionality checklist

| Area | Assertion |
| --- | --- |
| Read | Billing Type projects persisted values and retains a billable fallback. |
| Grouping | Billable time, fixed-price, milestones, and non-billable rows group deterministically. |
| Persistence | A concurrent billing-type update is visible on the next read. |
| Permissions | `timesheets.read` is required. |
| Scope | Actor/company filtering is enforced. |
| Empty state | No rows returns an empty result without synthetic groups. |
| Freshness | Stale row/version state is rejected by the focused fixture. |
| Restart | Migration replay and file-backed reopen preserve the projection. |
