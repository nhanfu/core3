# Verification and evidence disposition

Core3 was run at `http://127.0.0.1:4541` with authenticated Admin User.
Desktop captures use 1440x1000; mobile captures use 390x844. The list and
detail captures show deterministic Scrap Orders. The detail workflow validates
`SCRAP/2026/0002`, changes Date to `2026-01-21`, increments Revision 1 → 2,
and reloads with a Product Moves row for the same reference, product, quantity,
source, destination, and Done status.

Odoo was authenticated as `codex@core3.local` at
`http://127.0.0.1:8069/odoo/scraps`. Desktop renders the Scrap Orders list with
the source help text and list columns; mobile renders the responsive kanban
surface. Captures are paired in `odoo/`. No Odoo write was made.

Final disposition: PASS for the bounded Core3 lifecycle, persistence,
permissions, authenticated evidence, full Inventory suite, and UI audit.
Residual Odoo/Core3 gaps are explicitly listed in `source-comparison.md`; this
does not constitute full Inventory sign-off.
