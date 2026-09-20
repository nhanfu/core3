# Referrals parity audit

Status: blocked — live reference has no installed source module (2026-09-20)

This sub-plan is an audit gate, not an approval to clone an invented Referrals
screen. The parent register links this file for `referrals` / `hr_referral` and
keeps the module planned until the exact Odoo source and reference UI are
available.

## Odoo source and live-reference verification

The exact Odoo 19 addon was checked at each relevant local checkout:

- `/home/nhanjs/projects/odoo` (`19.0`): `addons/hr_referral/` is absent;
  consequently `__manifest__.py`, `views/`, `models/`, `security/`, `data/`,
  and `static/` for this addon are absent.
- `/home/nhanjs/projects/odoo-core3-demo`: `addons/hr_referral/` is absent.
- `/home/nhanjs/projects/odoo-core3-owned`: `addons/hr_referral/` is absent.
- `/home/nhanjs/projects/odoo-core3-personal`: `addons/hr_referral/` is absent.
- `/home/nhanjs/projects/odoo-core3-reference`: `addons/hr_referral/` is absent.

The broader local-project search found no `*/addons/hr_referral/__manifest__.py`
or `hr_referral` directory. There are only dependency-side references, not the
addon itself: `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`
and `hr_employee_public_views.xml` reference the addon icon, while
`/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_job.py` mentions its
protected `search_read`. These files do not establish the Referrals menu tree,
actions, views, labels, groups, routes, or demo data and must not be used as a
UI specification.

Because the addon manifest and view XML are unavailable, the following required
parity facts are unknown and intentionally unclaimed: the Odoo 19 menu and
submenu order, action/context bindings, visibility groups, models and fields,
list/form/kanban/graph/pivot states, exact visible labels, empty/error states,
responsive layout, and official demo-data coverage. No Odoo or Core3 browser
captures were attempted during this initial 2026-09-12 blocked audit; there is
still no truthful Odoo screen to compare against. Later authenticated Core3
route captures are recorded separately in the QA ledger.

The live reference was checked on 2026-09-20 at `http://localhost:8069`,
database `core3_reference`, using the configured local QA account without
recording credentials. The reference database reports `hr` installed but no
`hr_referral` module row, no `ir.ui.menu` whose label contains `Referral`, and
no matching action. The Odoo container's extra-addons path also contains no
referral addon. Therefore the exact live menu/action/view inventory is:

| Application | Menu / submenu | Action | View states | Visibility | Result |
| --- | --- | --- | --- | --- | --- |
| Referrals | none present | none | none | none | blocked: application is not installed in the live reference |

This is distinct from “the Odoo product does not have Referrals”: the official
Odoo 19 documentation describes Referrals, including `Referrals → Reporting →
Referral Analysis`, the points/rewards/alerts flows, and recruitment-access
boundaries. Those public docs establish candidate behavior only; they do not
establish the missing live action XML ids, view XML, groups, demo records, or
responsive layout.

## Current Core3 ownership

Core3 currently owns a separate, synthetic referrals foundation under
`sdk/bun/sample/services/referrals/`:

- `manifest.yaml` exposes `/referrals` and `/referral-analysis` under People.
- `pages/referrals.yaml` owns the list layout and visible List/Kanban/Pivot/Graph
  tabs; `pages/referral-detail.yaml` owns the detail form; `pages/analysis.yaml`
  owns summary/chart components; `api/*.yaml` owns the matching datasources and
  actions; and `pages/referral-workflow.yaml` owns Draft → Submitted → Hired →
  Rewarded or Rejected transitions.
- `permissions.yaml` declares `referrals.read`, `referrals.write`, and
  `referrals.manage`.
- `migrations/20260819000000-001-referrals-foundation.yaml` owns the DuckDB/
  PostgreSQL-shaped table contract, and
  `migrations/20260819001000-002-referrals-demo-data.yaml` owns one demo row.
- `storage.yaml` and `styles/index.scss` are the remaining service-owned
  boundary files.

This is an existing Core3 ownership boundary, not evidence of Odoo parity. The
current wave moved the datasource/action contracts into page-matched
`services/referrals/api/*.yaml` fragments and added HTTP-state metadata plus
real create/update/delete guards. The module remains source-limited: fixtures
are not yet complete for every required state, migrations/workflows still use
process-time date/timestamp defaults and a generated UUID schema default. Fresh
authenticated Core3 desktop/mobile route evidence is now recorded under
`/tmp/core3-odoo-parity/referrals-20260920-rerun/`, but paired Odoo visual
comparison remains unavailable.

## Blocking dependency and next gate

Obtain and install a matching Odoo 19 `hr_referral` addon checkout (including its
`__manifest__.py`, Python models, XML views/actions/menus/security, demo data,
and static assets) and install or otherwise expose that module in the active
Odoo reference database from the parent plan. Then record the exact visible
menu/action/view inventory and authenticated `1440x900` and `390x844` Odoo
captures before marking this sub-plan `ready`.

Only after that inventory is reviewed should Core3 work proceed: move page
datasources/mutations into `services/referrals/api/` joined by matching
`page.id`, replace synthetic contracts with deterministic Odoo-shaped fixtures,
add permission and HTTP-state tests, and implement one bounded screen slice
with authenticated desktop/mobile Core3 captures under `/tmp/core3-odoo-parity`.
Until the dependency is supplied, the existing Core3 routes and labels remain
unapproved approximations and must not be described as Odoo 19 Referrals
parity. Any implementation made from public documentation in the meantime is
provisional and must retain this blocker rather than upgrading the parity
status.

## Current-wave gap matrix (provisional, source-blocked)

| Stable ID | Odoo evidence | Current Core3 source | Gap / required change | Verification |
| --- | --- | --- | --- | --- |
| REF-MENU-001 | No live menu/action; docs indicate a Referrals application | `services/referrals/manifest.yaml` | Keep the route out of parity sign-off until the live menu tree is installed and captured | Live DB menu query plus authenticated Odoo capture |
| REF-REPORT-001 | Docs identify `Referrals → Reporting → Referral Analysis` | `pages/analysis.yaml` embeds SQL | Move report datasource into `services/referrals/api/analysis.yaml`; retain matching `page.id`; add deterministic report states | API contract test and desktop/mobile comparison after source unblock |
| REF-POINTS-001 | Docs describe referral points and “My Referrals” | No Core3 model or page | Add employee/referral-point domain only after model and fields are confirmed from addon source | CRUD, persistence, permission, workflow tests |
| REF-REWARD-001 | Docs describe reward configuration and redemption | Synthetic reward amount on `referrals` table | Replace with confirmed reward/product/company relations; current field is not accepted as Odoo parity | Configuration CRUD and redemption workflow |
| REF-ALERT-001 | Docs describe referral alerts | No Core3 alert contract | Add only after exact model/action/notification behavior is verified | Notification and dismissal tests |
| REF-CONTRACT-001 | Shared contract requires API/page separation and fixture modes | All current page files own SQL and no `api/` directory exists | Split API/action YAML from presentation, add default/filtered/empty/error/forbidden/not-found/409/422 contracts | YAML discovery, HTTP contract, permission tests |

The matrix is actionable for provisional Core3 hardening, but it does not
close the Odoo parity blocker.

## Acceptance checklist after unblocking

- [ ] Exact Odoo 19 addon manifest, version, dependencies, groups, and demo-data
      declaration recorded.
- [ ] Complete Odoo menu/action/view inventory and exact visible text recorded.
- [ ] Odoo desktop/mobile reference captures recorded under `/tmp`.
- [ ] Core3 page/API fragments are joined through matching `page.id` and keep
      API/action ownership separate from presentation YAML.
- [ ] Deterministic default, filtered, empty, error, forbidden, not-found,
      stale-write, and invalid-input fixtures/contracts are tested.
- [ ] Authenticated Core3 desktop/mobile captures are compared with Odoo;
      images remain outside Git.
