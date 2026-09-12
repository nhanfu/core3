# Approvals parity source gate

Status: blocked — reference source unavailable; no UI implementation authorized.

Audit date: 2026-09-12

## Parent-plan scope

The module register in `../odoo-ui-parity-plan.md` identifies `approvals` as
planned and records its Odoo source as unavailable. This sub-plan remains
unapproved for implementation. The required menu, action, view, addon, and
authenticated desktop/mobile comparison gates cannot be completed without a
truthful Odoo reference.

## Local Odoo source audit

The path `../odoo` from this worktree resolves to
`/home/nhanjs/projects/core3-worktrees/odoo`, which is missing. The separate
local Odoo checkout inspected for the supplied reference is
`/home/nhanjs/projects/odoo`, on branch `19.0` tracking `origin/19.0`, at
revision `659759969d535d286b656c96b675e4612b925ddd`.

The exact approvals paths checked in that checkout are absent:

| Checked path | Result |
| --- | --- |
| `/home/nhanjs/projects/core3-worktrees/odoo` | missing checkout |
| `/home/nhanjs/projects/core3-worktrees/odoo/addons/approvals` | unavailable because parent checkout is missing |
| `/home/nhanjs/projects/core3-worktrees/odoo/addons/approvals/__manifest__.py` | unavailable because parent checkout is missing |
| `/home/nhanjs/projects/odoo/addons/approvals` | missing |
| `/home/nhanjs/projects/odoo/addons/approvals/__manifest__.py` | missing |
| `/home/nhanjs/projects/odoo/enterprise/addons/approvals` | missing; no local enterprise tree was found |

An exhaustive tracked-file/path check of the supplied `/home/nhanjs/projects/odoo`
`HEAD` found no approvals addon or approvals manifest. The only manifest text
matches for `approval` were unrelated descriptions in
`account_peppol_response` and `l10n_dk_nemhandel_response`; these do not provide
the Approvals application source, menus, views, assets, or demo data.

The audit was reproduced with `git ls-tree -r --name-only HEAD` filtered for
approval paths and direct existence checks for the three candidate addon paths
above. The tracked-path query returned no Approvals addon or manifest; the only
source-tree candidate was the unrelated
`addons/website/static/src/interactions/cookies/cookies_approval.js` asset.

Therefore no Odoo application menu tree, action identifiers, visibility groups,
routes, views, responsive states, official demo-data declaration, or reference
screenshots can be recorded from the available local source. No authenticated
desktop (`1440x900`) or mobile (`390x844`) capture was attempted: there is no
local Approvals reference surface to navigate or compare.

## Current Core3 ownership

Core3 does have a separate, pre-existing YAML domain service at
`sdk/bun/sample/services/approvals/`. Its ownership is explicit in:

- `manifest.yaml`: `/approvals`, Requests, Approval Types, and Approval Analysis
  menu entries;
- `permissions.yaml`: `approvals.read`, `approvals.write`,
  `approvals.manage`, and `approvals.attachment.download`;
- `pages/requests.yaml`, `pages/request-detail.yaml`, `pages/types.yaml`, and
  `pages/analysis.yaml`: request/type/analysis page contracts;
- `pages/approval-workflow.yaml`: draft, submitted, approved, refused, and
  cancelled workflow declarations;
- the approvals migrations and `test/approvals.integration.test.ts`: local
  schema, deterministic demo records, mutation guards, attachments, and
  assigned/unique approver checks;
- `sdk/bun/sample/config.yaml`: the enabled Core3 `approvals` module entry.

This is a Core3 service boundary and integration contract, not evidence of Odoo
UI parity. Its existing labels, routes, fixtures, workflows, and components
must not be treated as Odoo labels or cloned reference behavior while the Odoo
source gate is closed.

## Dependency / next gate

Keep the module `planned` and do not add or revise Approvals screens for parity.
Resume only when the reference dependency supplies a verifiable Odoo 19
Approvals addon or an authoritative equivalent containing, at minimum, its
manifest, complete menu/action/view source, security/visibility declarations,
assets, and any available demo-data declaration. Then:

1. audit the exact addon and record the complete visible menu tree and reachable
   screens;
2. inspect the authenticated reference at `1440x900` and `390x844`, recording
   routes and comparison captures under `/tmp/core3-odoo-parity` only;
3. reconcile the reference contract with the existing Core3 service boundary;
4. obtain sub-plan approval before any parity implementation or fixture/UI
   changes.

Until that dependency is present, the honest conclusion is **source unavailable;
UI cloning blocked**. No Odoo labels, routes, fixtures, screenshots, or visual
claims are asserted by this sub-plan.
