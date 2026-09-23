# CRM-TEAM-ASSIGN-LEADS-001

Bounded source-backed evidence for the Odoo CRM Sales Team `Assign Leads`
header action.

- Date: 2026-09-23
- Owner: CRM module owner
- Odoo source: `/home/nhanjs/projects/odoo/addons/crm`
- Odoo action/method: `crm.team.action_assign_leads`
- Core3 page/API: `team-detail`, joined by `page.id: team-detail`
- Core3 action: `crm.teams.assign_leads`
- Permission: `crm.manage`
- Status: conditional bounded implementation; no CRM module sign-off

Artifacts:

- `odoo-analysis.md` — source behavior and exact source locations
- `functionality-checklist.md` — feature acceptance cases
- `source-comparison.md` — Odoo/Core3 mapping and limits
- `gap-matrix.md` — pass/open/blocker matrix
- `test-results.md` — focused test and diff-check results
- `verification.md` — BrowserSkill attempt and exact visual blocker

No screenshots are claimed or stored: the authenticated Odoo tab was already
borrowed by another BrowserSkill session.
