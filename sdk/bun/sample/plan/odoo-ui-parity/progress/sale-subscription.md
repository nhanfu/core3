# sale-subscription parity progress

Module owner: sale-subscription module owner
QA assignment: module-owner verification in the current five-worker wave
Status: in-progress
Verification trigger: contract-normalization candidate
Candidate commit: pending

## Current state

The live reference is reachable at `http://localhost:8069`, but
`sale_subscription` is `uninstallable`, absent from the container filesystem,
and has no authenticated Subscriptions menu, action, or model-backed view.
The source gate therefore remains active and no Odoo visual-parity claim is
made. Core3 does have a working YAML-first service with deterministic
subscription, invoice, and plan storage; the current implementation gap is
that three page files still own backend contracts instead of joining separate
API files by `page.id`.

Completed analysis for this wave:

- recorded the live module state and menu/action/view absence in
  `subscriptions.md`;
- classified the page/API contract split, lifecycle, deterministic-data,
  permission, and visual gaps; and
- selected contract normalization plus repository-backed lifecycle QA as the
  next bounded implementation slice.

## Next bounded task

Normalize the three remaining page/API contracts, then run focused discovery,
mutation, lifecycle, permission, persistence, and Core3 desktop/mobile route
checks. Keep the reference-dependent menu/view parity items explicitly
blocked until the addon is installed in the live database.
