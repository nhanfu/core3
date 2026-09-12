# Referrals parity audit

Status: blocked — source dependency unavailable (2026-09-12)

This sub-plan is an audit gate, not an approval to clone an invented Referrals
screen. The parent register links this file for `referrals` / `hr_referral` and
keeps the module planned until the exact Odoo source and reference UI are
available.

## Odoo source verification

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
captures were attempted for this blocked audit; there is no truthful Odoo
screen to compare against.

## Current Core3 ownership

Core3 currently owns a separate, synthetic referrals foundation under
`sdk/bun/sample/services/referrals/`:

- `manifest.yaml` exposes `/referrals` and `/referral-analysis` under People.
- `pages/referrals.yaml` owns a list and create form; `pages/referral-detail.yaml`
  owns a detail form; `pages/analysis.yaml` owns summary/chart components; and
  `pages/referral-workflow.yaml` owns Draft → Submitted → Hired → Rewarded or
  Rejected transitions.
- `permissions.yaml` declares `referrals.read`, `referrals.write`, and
  `referrals.manage`.
- `migrations/20260819000000-001-referrals-foundation.yaml` owns the DuckDB/
  PostgreSQL-shaped table contract, and
  `migrations/20260819001000-002-referrals-demo-data.yaml` owns one demo row.
- `storage.yaml` and `styles/index.scss` are the remaining service-owned
  boundary files.

This is an existing Core3 ownership boundary, not evidence of Odoo parity. It
currently fails the shared screen-mock contract in
`odoo-ui-parity/screen-mock-data.md`: page files contain SQL datasource
definitions instead of page-matched service API fragments; no
`services/referrals/api/` directory exists; fixtures are not declared for
default, filtered, empty, error, forbidden, not-found, stale-write, and invalid
input states; migrations/workflows use `CURRENT_DATE`, `CURRENT_TIMESTAMP`, and
a generated UUID default; and no focused referrals test or authenticated
desktop/mobile comparison evidence is present.

## Blocking dependency and next gate

Obtain a matching Odoo 19 `hr_referral` addon checkout (including its
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
parity.

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
