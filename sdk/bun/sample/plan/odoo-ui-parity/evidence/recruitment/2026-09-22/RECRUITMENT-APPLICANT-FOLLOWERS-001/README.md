# RECRUITMENT-APPLICANT-FOLLOWERS-001

Bounded source-backed slice: the applicant list/kanban `Add/Remove Followers`
wizard, durable follower subscriptions, optional notification audit, and
restart persistence.

Core3 route: `/applicants` (bulk action) and `/applicants/detail` (read-only
follower summary).

Odoo source revision: `659759969d535d286b656c96b675e4612b925ddd`.

Artifacts map: `odoo-analysis.md` and `menu-action-inventory.md` record the
source/live comparison; `functionality-checklist.md` and `gap-matrix.md` are
the acceptance scope; `test-results.md` records executable checks;
`verification.md` records browser evidence and the live-reference blocker.
The blocker captures are outside Git under `/tmp/core3-odoo-parity/` because
the live reference did not expose Recruitment.
