# CRM-TEAM-OVERDUE-OPPORTUNITIES-001

Bounded source-backed evidence for Odoo's `crm_lead_action_team_overdue_opportunity`.

- Odoo source: `/home/nhanjs/projects/odoo/addons/crm/views/crm_team_views.xml`
  defines `Overdue Opportunities`, model `crm.lead`, view modes
  `kanban,list,graph,form,calendar,pivot`, the opportunity domain, and the
  team/default-user context. The matching hidden search filter in
  `crm_lead_views.xml` is `date_closed = false` and `date_deadline < today`.
- Core3 implementation: page/API ID `crm-team-overdue-opportunities`, route
  `/crm/team-overdue-opportunities`, team-detail stat action, migration `0.0.31`,
  and focused restart/access coverage.
- Live reference: `http://localhost:8069`, database `core3_reference`,
  authenticated shared QA session, 2026-09-22. CRM is installed and the
  Pipeline/Sales Teams surfaces were reachable.
- The target action is not exposed in the visible menu for this QA user, and
  direct `ir.actions.act_window` metadata access is restricted. No target-action
  screenshot is claimed; the source contract and adjacent authenticated CRM
  surfaces are recorded instead.

Screenshots are outside Git:

- Odoo Pipeline desktop 1440x900:
  `/tmp/core3-odoo-parity/evidence/crm/2026-09-22/CRM-TEAM-OVERDUE-OPPORTUNITIES-001/odoo-pipeline-desktop.png`
  SHA-256 `fdf2c4b4b67917d7998a3af8002fd30de33d4497a8618bf135f6e7299afd8033`
- Odoo Pipeline mobile 390x844:
  `/tmp/core3-odoo-parity/evidence/crm/2026-09-22/CRM-TEAM-OVERDUE-OPPORTUNITIES-001/odoo-pipeline-mobile.png`
  SHA-256 `735a450549ffbc7726abb546dae3be042ba9bc3f8b3d6df8cc37886af55696a0`
- Odoo Sales Teams desktop 1440x900:
  `/tmp/core3-odoo-parity/evidence/crm/2026-09-22/CRM-TEAM-OVERDUE-OPPORTUNITIES-001/odoo-sales-teams-desktop.png`
  SHA-256 `c5d2bf6f35dbbafbbbfc21cb7b48f132ea970aa81417e846a7e65700ae7f8916`

Core3 target-route visual evidence is blocked by the shared runtime's unrelated
Events discovery failures (`upload_event_badge_background` and unregistered
`FormSection`); no Core3 visual parity claim is made.
