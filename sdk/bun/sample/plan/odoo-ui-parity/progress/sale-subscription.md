# sale-subscription parity progress

Module owner: sale-subscription module owner
QA assignment: module-owner verification in the current five-worker wave
Status: implementation candidate
Verification trigger: authenticated route QA and Odoo addon availability
Candidate commit: 762d127d

## Current state

The live reference is reachable at `http://localhost:8069`, but
`sale_subscription` is `uninstallable`, absent from the container filesystem,
and has no authenticated Subscriptions menu, action, or model-backed view.
The source gate therefore remains active and no Odoo visual-parity claim is
made. Core3 does have a working YAML-first service with deterministic
subscription, invoice, and plan storage; the current implementation gap is
that three page files owned backend contracts instead of joining separate API
files by `page.id`. Commit `762d127d` fixes that contract boundary and adds
state plus optimistic-version guards to lifecycle actions.

Completed analysis for this wave:

- recorded the live module state and menu/action/view absence in
  `subscriptions.md`;
- classified the page/API contract split, lifecycle, deterministic-data,
  permission, and visual gaps; and
- selected contract normalization plus repository-backed lifecycle QA as the
  next bounded implementation slice.

Focused implementation evidence for `762d127d`:

- isolated page/API schema validation passed for all four pages and the
  workflow schema;
- idempotent migrations produced 2 subscriptions, 1 invoice, and 2 plans;
- create/edit validation rejected invalid dates, lifecycle transitions moved
  quotation → in progress → paused → closed, and closed → churn was rejected;
- activation generated one invoice, recurring invoice generation advanced the
  next date, posting persisted the invoice state, and all action permissions
  were declared.

## Next bounded task

Run authenticated Core3 desktop/mobile route checks and keep the
reference-dependent menu/view parity items explicitly blocked until the addon
is installed in the live database.
