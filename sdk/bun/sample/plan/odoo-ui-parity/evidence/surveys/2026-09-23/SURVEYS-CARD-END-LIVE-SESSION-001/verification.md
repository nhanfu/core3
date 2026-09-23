# Verification

The Odoo reference Cards screen was loaded through BrowserSkill at
`http://localhost:8069/odoo/surveys?db=core3_reference` without changing
reference data. Desktop 1916x833 showed active Feedback Form and Burger Quiz
cards with `End Live Session`. The iphone-14 390x844 capture showed the compact
mobile cards, where the desktop footer actions are collapsed.

The Core3 mutation was verified directly against fresh in-memory and
file-backed DuckDB stores. The feature test proves that a Ready session closes
to Closed, clears its current-question fields, marks both active attendees
Completed, increments row version 2 to 3, rejects no-actor/stale/inactive
replays, and retains the closed state after reopen.

No visual parity sign-off is claimed because the fresh Core3 module server
exited before readiness on the unrelated Events page-schema error.
