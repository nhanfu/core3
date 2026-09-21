# Verification

Authenticated Odoo browser session used instance `245ea108` and database
`core3_reference` at `http://localhost:8069`; the session was stopped after
capture. The desktop PNG is 1916x833 and the mobile/touch PNG is 390x844.
Odoo showed the Expenses menu, expense rows, status values, view tabs, and the
category surface during the live observation. No live record was mutated.

The Agent Window resize to 1440x900 did not persist, so an exact 1440x900
category-detail comparison is not claimed. No local Core3 listener was
available on the checked ports, so no authenticated Core3 interaction or
Core3 screenshot is claimed. Full module actor/visual sign-off remains open.

Focused category-cost/category/migration tests passed with 8 tests and 61
assertions. The module migration is idempotent and replay-tested.
