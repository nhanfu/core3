# sale-renting parity progress

Module owner: sale-renting module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: blocked-reference / implementation checkpoint pending
Verification trigger: focused Core3 slice complete, then reference re-audit
Candidate commit: none

## Current state

The 2026-09-20 authenticated reference audit found no installed `sale_renting`
addon, Rental menu, rental action, rental view, or rental-specific fields. The
source gate remains blocked and no Odoo parity claim is made. Core3 already
has deterministic rental persistence, page contracts, and workflow YAML; the
next bounded implementation slice is to separate backend API/action YAML from
page layout YAML and correct the service-owned `/rental-events` route.

## Next bounded task

The current-wave owner must commit the API/page boundary and route correction,
then verify the existing rental lifecycle with real service queries and
permission-bound actions. Re-audit the live reference before any Odoo-derived
labels, menu claims, or visual sign-off.

## Current evidence

- Reference inventory: `rental.md`, current live reference audit dated
  2026-09-20; `sale_renting` is absent from `ir.module.module`.
- Core3 baseline: service-owned rental pages, migrations, permissions, and
  workflow are present; the events manifest path is `/events` and must become
  `/rental-events`.
- Candidate commit: pending first focused implementation commit.
